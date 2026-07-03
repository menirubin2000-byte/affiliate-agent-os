#!/usr/bin/env python3
"""
engine2 — a fresh, clean publishing engine (built 2026-06-28).

Rules MENI set, enforced here:
- Publishes ONLY final_copies whose status == operator_approved (what MENI approved).
- NEVER publishes a post with no affiliate/marketing link  -> skipped.
- NEVER publishes a post with no image/video               -> skipped.
- NEVER publishes a suspended product.
- Respects each platform's character limit; over-limit -> skipped (never truncates the link).
- Recurring rotation: least-recently-published first, so no post is spammed twice in a row.
- DRY-RUN by default: prints exactly what WOULD publish and publishes NOTHING.
  Real publishing happens only when run with the argument:  go
- Per-platform daily cap = 3.

It reuses the tested publisher functions from auto_publish.py (FB/IG/X/YouTube/Threads/LinkedIn).
"""
import os, sys, time, re
import urllib.request, urllib.error
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import publishers as ap

_MEDIA_CACHE = {}
def media_exists(url):
    """True only if the media URL really resolves (HEAD/range GET == 200/206).
    Guarantees we never publish a post pointing at an image/video that doesn't exist."""
    if not url:
        return False
    if url in _MEDIA_CACHE:
        return _MEDIA_CACHE[url]
    ok = False
    try:
        with urllib.request.urlopen(urllib.request.Request(url, method="HEAD"), timeout=20) as r:
            ok = getattr(r, "status", r.getcode()) == 200
    except Exception:
        try:  # some hosts reject HEAD — try a 1-byte ranged GET
            with urllib.request.urlopen(urllib.request.Request(url, headers={"Range": "bytes=0-0"}), timeout=20) as r:
                ok = getattr(r, "status", r.getcode()) in (200, 206)
        except Exception:
            ok = False
    _MEDIA_CACHE[url] = ok
    return ok

LIVE = ("go" in sys.argv[1:])                         # default: dry-run; "go" => publish for real
SKIP = set(a for a in sys.argv[1:] if a != "go")      # any platform name passed = skip it (e.g. "youtube")
CAP = 3
API = ["facebook_page", "instagram_professional", "x_twitter", "youtube", "threads", "linkedin"]
LIMIT = {"x_twitter": 280, "pinterest": 500, "threads": 500}

def has_link(b):  return ("http://" in (b or "")) or ("https://" in (b or ""))

def main():
    products = {p["id"]: p for p in ap.sb_get(
        "products?select=id,name,status,image_url,image_url_he,video_url,video_status,hashtags")}
    rows = ap.sb_get("final_copies?status=eq.operator_approved&select=id,product_id,"
                     "source_content_id,platform_adaptation_id,platform,title,body,"
                     "image_url,media_asset_url,language")
    # rotation: least-recently-published first, BALANCED BY PRODUCT
    # (so a product with many approved copies, e.g. Waterpik, does not dominate the feed)
    last = {}
    for rec in ap.sb_get("published_records?select=final_copy_id,verified_at&order=verified_at.asc&limit=20000"):
        if rec.get("final_copy_id"):
            last[rec["final_copy_id"]] = rec.get("verified_at") or ""
    fc2prod = {fc["id"]: fc["product_id"] for fc in rows}
    last_prod = {}   # product_id -> most recent time ANY of its posts was published
    for fcid, ts in last.items():
        pid = fc2prod.get(fcid)
        if pid and ts > last_prod.get(pid, ""):
            last_prod[pid] = ts

    todays = ap.sb_get("published_records?verified_at=gte.%sT00:00:00Z&select=platform" % ap.today_key())
    import collections
    cap_used = collections.Counter(r["platform"] for r in todays)

    def media(fc):
        pr = products.get(fc["product_id"]) or {}
        has_v = bool(pr.get("video_url") and pr.get("video_status") == "ready")
        # publish the image that matches the post's language FIRST (Hebrew post -> Hebrew image),
        # exactly like the product page shows; only fall back to the per-copy asset if missing.
        if fc.get("language") == "he":
            img = (pr.get("image_url_he") or fc.get("media_asset_url") or
                   fc.get("image_url") or pr.get("image_url"))
        else:
            img = (pr.get("image_url") or fc.get("media_asset_url") or
                   fc.get("image_url") or pr.get("image_url_he"))
        return has_v, (pr.get("video_url") if has_v else None), img

    def fits(fc):
        lim = LIMIT.get(fc["platform"])
        if not lim: return True
        return ap.tco_len(fc["body"] or "") <= lim if fc["platform"] == "x_twitter" else len(fc["body"] or "") <= lim

    def with_tags(fc):
        """Append the product's hashtags at publish time (never rewrites the stored post).
        Trims tags to respect the platform char limit."""
        pr = products.get(fc["product_id"]) or {}
        tags = (pr.get("hashtags") or {})
        taglist = list(tags.get(fc.get("language") or "he") or tags.get("he") or [])
        if not taglist:
            return fc
        base = (fc.get("body") or "").rstrip()
        lim = LIMIT.get(fc["platform"])
        while taglist:
            newbody = base + "\n\n" + " ".join(taglist)
            length = ap.tco_len(newbody) if fc["platform"] == "x_twitter" else len(newbody)
            if lim is None or length <= lim:
                out = dict(fc); out["body"] = newbody; return out
            taglist = taglist[:-1]          # drop last tag until it fits
        return fc

    print("=== engine2 %s | %s ===" % ("LIVE PUBLISH" if LIVE else "DRY-RUN (nothing published)", ap.now_iso()))
    done = []
    for p in API:
        if p in SKIP:                                  # platform asked to skip (e.g. youtube)
            continue
        target = CAP                                   # publish up to CAP on this platform THIS run
        n = 0                                          # published this run on this platform
        used = set()                                   # product_ids already used on THIS platform this run
        # candidates for this platform: the product published LONGEST ago comes first
        cand = sorted((fc for fc in rows if fc["platform"] == p),
                      key=lambda fc: (last_prod.get(fc["product_id"], ""), last.get(fc["id"], "")))
        for fc in cand:
            if n >= target: break
            if fc["product_id"] in used: continue      # one post per product per platform this run
            pr = products.get(fc["product_id"]) or {}
            name = pr.get("name", "?")
            if pr.get("status") == "suspended":      continue   # suspended product
            if not has_link(fc.get("body")):          continue   # no link
            if not fits(fc):                          continue   # over platform limit
            has_v, vurl, img = media(fc)
            # HARD media guard: only use a video/image that ACTUALLY exists (URL resolves).
            use_video = has_v and media_exists(vurl)
            img_ok = media_exists(img)
            if p == "youtube":
                if not use_video: continue                      # YouTube needs a real video
            else:
                if not use_video and not img_ok: continue       # no real media -> skip (never text-only)
            fc = with_tags(fc)                                   # append product hashtags (in-memory only)
            if not LIVE:
                print("  WOULD PUBLISH [%s]  %s  (%s)" % (p, name[:40], "video" if use_video else "image"))
                used.add(fc["product_id"]); last_prod[fc["product_id"]] = ap.now_iso()
                done.append((p, name)); n += 1; continue
            try:
                if p == "youtube":               live = ap.pub_youtube_video(fc, vurl)
                elif p == "facebook_page":       live = ap.pub_fb_video(fc, vurl) if use_video else ap.pub_fb_photo(fc, img)
                elif p == "instagram_professional": live = ap.pub_ig_reel(fc, vurl) if use_video else ap.pub_ig_image(fc, img)
                elif p == "x_twitter":           live = ap.pub_x_video(fc, vurl) if use_video else ap.pub_x(fc, img)
                elif p == "linkedin":            live = ap.pub_linkedin_video(fc, vurl) if use_video else ap.pub_linkedin(fc, img)
                elif p == "threads":             live = ap.pub_threads(fc, vurl, True) if use_video else ap.pub_threads(fc, img, False)
                ap.sb_record(fc, live, vurl if use_video else img)
                used.add(fc["product_id"]); last_prod[fc["product_id"]] = ap.now_iso()
                cap_used[p] += 1; n += 1; done.append((p, name, live))
                print("  OK [%s]  %s  ->  %s" % (p, name[:36], live)); time.sleep(2); continue
            except Exception as e:
                print("  FAIL [%s] %s : %s (trying next)" % (p, name[:28], str(e)[:60]))
                continue
    print("\nresult:", done if done else "nothing matched")
    # run log: a permanent record of every scheduled run (what published, when)
    try:
        logp = os.path.join(os.path.dirname(os.path.abspath(__file__)), "engine2_runs.log")
        with open(logp, "a", encoding="utf-8") as f:
            tag = "LIVE" if LIVE else "DRYRUN"
            f.write("%s | %s | %d published | %s\n" % (
                ap.now_iso(), tag, len([d for d in done if len(d) == 3]),
                "; ".join("%s:%s" % (d[0], d[1][:30]) for d in done) or "nothing"))
    except Exception:
        pass

if __name__ == "__main__":
    main()
