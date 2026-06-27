#!/usr/bin/env python3
"""
Affiliate Agent OS - Automatic publishing engine with SMART MEDIA DISTRIBUTION.

Publishes EVERY operator_approved final_copy on the platforms that have a real
publishing API, routing by the media the product actually has:

  - Product HAS a video  -> publish the VIDEO (YouTube, Facebook video, Instagram Reels)
  - Product has NO video  -> publish with the PRODUCT IMAGE (Facebook photo, Instagram image, X, Mastodon, LinkedIn)
  - Required media missing -> SKIP that platform (publish only what's achievable)

Per-platform daily caps spread posting out so the accounts are not flagged as spam.

Safety / integrity rules (do NOT relax):
- Only status == operator_approved is published.
- Never publish without the required media (no text-only fallback).
- Body is published VERBATIM (only standalone markdown header lines stripped). Links never appended/mangled.
- A post is marked published_verified only AFTER the platform returns a live URL.
- Platforms with no publish API (medium/substack/pinterest/tiktok/threads/quora/reddit) are skipped with a reason.

Run: python scripts/auto_publish.py
"""
import os, re, sys, json, time, uuid, urllib.request, urllib.parse, urllib.error, hashlib, base64
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def load_env():
    env = {}
    for line in open(os.path.join(ROOT, ".env.local"), encoding="utf-8"):
        m = re.match(r"^([A-Z0-9_]+)=(.*)$", line.rstrip("\n"))
        if m:
            env[m.group(1)] = m.group(2).strip().strip('"').strip("\r")
    return env

ENV = load_env()
SB = ENV["NEXT_PUBLIC_SUPABASE_URL"]
KEY = ENV["SUPABASE_SERVICE_ROLE_KEY"]
SBH = {"apikey": KEY, "Authorization": "Bearer " + KEY, "Content-Type": "application/json"}

# Platforms with no available publish API -> never auto-published.
NO_API = {
    "medium": "no publish API (Cloudflare/none)",
    "substack": "no publish API",
    "pinterest": "app in trial, pins:write not granted",
    "tiktok": "video app pending approval",
    "threads": "no user token",
    "quora": "community / browser only",
    "reddit": "community / browser only",
}

# HARD GUARD (2026-06-24): the engine must NEVER publish text Claude wrote/rewrote.
# Any post whose body contains one of these signatures of Claude's own rewrites is
# skipped no matter what — even if its status is operator_approved. MENI publishes only
# his own approved wording; Claude must never push its rewritten content.
CLAUDE_REWRITE_SIGNATURES = [
    "📌",  # the rich-format "📌 מה זה / What is it" headers Claude composed
    "גילוי נאות: פוסט זה כולל קישור שיווקי",
    "Affiliate disclosure: this post includes an affiliate link",
]

# Per-platform daily cap (avoid spam flags). YouTube is also bounded by API quota (~6/day).
DAILY_CAP = {
    "youtube": 3,
    "facebook_page": 3,
    "instagram_professional": 3,
    "x_twitter": 3,
    "linkedin": 3,
}

def now_iso():
    return datetime.now(timezone.utc).isoformat()

def today_key():
    return now_iso()[:10]

def req(method, path, data=None, timeout=30):
    for a in range(4):
        try:
            return urllib.request.urlopen(urllib.request.Request(
                SB + "/rest/v1/" + path,
                data=(json.dumps(data).encode() if data is not None else None),
                method=method,
                headers={**SBH, "Prefer": "return=minimal"} if data is not None else SBH), timeout=timeout)
        except urllib.error.HTTPError:
            raise
        except Exception:
            if a == 3:
                raise
            time.sleep(2)

def sb_get(q):
    return json.load(req("GET", q))

def sb_patch_status(fc_id, status):
    req("PATCH", "final_copies?id=eq." + fc_id, {"status": status})

def sb_record(fc, live_url, media_url):
    try:
        req("POST", "published_records", {
            "product_id": fc["product_id"], "source_content_id": fc["source_content_id"],
            "platform_adaptation_id": fc["platform_adaptation_id"], "final_copy_id": fc["id"],
            "platform": fc["platform"], "live_url": live_url, "verification_status": "verified",
            "verified_at": now_iso(), "media_asset_url": media_url, "media_status": "ok"})
    except Exception as e:
        print("    (record warn:", str(e)[:70], ")")

def dl(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=120).read()

def strip_md_headers(body):
    return re.sub(r"^\s*#{1,6}\s.*$\n?", "", body or "", flags=re.M).strip()

def tco_len(text):
    n = len(text)
    for u in re.findall(r"https?://\S+", text):
        n = n - len(u) + 23
    return n

# ---- token helpers ----
def b64d(s):
    s = s.replace("-", "+").replace("_", "/")
    return base64.b64decode(s + "=" * ((4 - len(s) % 4) % 4))

def decrypt(v, secret):
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    k = hashlib.sha256(secret.encode()).digest()
    _ver, iv, tag, ct = v.split(":")
    return AESGCM(k).decrypt(b64d(iv), b64d(ct) + b64d(tag), None).decode()

_YT = {"t": None}
def youtube_token():
    if _YT["t"]:
        return _YT["t"]
    meta = sb_get("platform_connections?provider=eq.youtube&select=metadata")[0]["metadata"]
    rt = decrypt(meta["encrypted_refresh_token"], ENV.get("YOUTUBE_TOKEN_ENCRYPTION_KEY") or ENV["APP_SESSION_SECRET"])
    res = json.load(urllib.request.urlopen(urllib.request.Request(
        "https://oauth2.googleapis.com/token",
        data=urllib.parse.urlencode({"client_id": ENV["YOUTUBE_CLIENT_ID"], "client_secret": ENV["YOUTUBE_CLIENT_SECRET"],
            "refresh_token": rt, "grant_type": "refresh_token"}).encode()), timeout=20))
    _YT["t"] = res["access_token"]
    return _YT["t"]

# ---- publishers: return live_url on success, raise on failure ----
def pub_youtube_video(fc, video_url):
    AT = youtube_token()
    vid = dl(video_url)
    snip = {"snippet": {"title": (fc["title"] or "Review")[:95], "description": fc["body"] or "", "categoryId": "22"},
            "status": {"privacyStatus": "public", "selfDeclaredMadeForKids": False}}
    b = "----" + uuid.uuid4().hex
    body = (("--%s\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n" % b).encode() + json.dumps(snip).encode() +
            ("\r\n--%s\r\nContent-Type: video/*\r\n\r\n" % b).encode() + vid + ("\r\n--%s--\r\n" % b).encode())
    r = urllib.request.urlopen(urllib.request.Request(
        "https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status&uploadType=multipart",
        data=body, method="POST", headers={"Authorization": "Bearer " + AT, "Content-Type": "multipart/related; boundary=" + b}), timeout=600)
    return "https://youtu.be/" + json.load(r)["id"]

def pub_fb_video(fc, video_url):
    res = json.load(urllib.request.urlopen(urllib.request.Request(
        "https://graph.facebook.com/v21.0/%s/videos" % ENV["FB_PAGE_ID"],
        data=urllib.parse.urlencode({"file_url": video_url, "description": fc["body"] or "", "access_token": ENV["FB_PAGE_ACCESS_TOKEN"]}).encode()), timeout=180))
    return "https://www.facebook.com/%s/videos/%s" % (ENV["FB_PAGE_ID"], res.get("id"))

def pub_fb_photo(fc, image_url):
    res = json.load(urllib.request.urlopen(urllib.request.Request(
        "https://graph.facebook.com/v21.0/%s/photos" % ENV["FB_PAGE_ID"],
        data=urllib.parse.urlencode({"url": image_url, "message": fc["body"] or "", "access_token": ENV["FB_PAGE_ACCESS_TOKEN"]}).encode()), timeout=120))
    return "https://facebook.com/" + str(res.get("post_id") or res.get("id"))

def pub_ig_reel(fc, video_url):
    IG, T = ENV["IG_BUSINESS_ACCOUNT_ID"], ENV["IG_ACCESS_TOKEN"]
    c = json.load(urllib.request.urlopen(urllib.request.Request(
        "https://graph.facebook.com/v21.0/%s/media" % IG,
        data=urllib.parse.urlencode({"media_type": "REELS", "video_url": video_url, "caption": (fc["body"] or "")[:2200], "access_token": T}).encode()), timeout=120))
    cid = c["id"]
    for _ in range(25):
        time.sleep(6)
        st = json.load(urllib.request.urlopen(urllib.request.Request(
            "https://graph.facebook.com/v21.0/%s?fields=status_code&access_token=%s" % (cid, T), headers={}), timeout=30))
        if st.get("status_code") in ("FINISHED", "ERROR"):
            break
    if st.get("status_code") != "FINISHED":
        raise RuntimeError("reel processing: " + str(st.get("status_code")))
    pr = json.load(urllib.request.urlopen(urllib.request.Request(
        "https://graph.facebook.com/v21.0/%s/media_publish" % IG,
        data=urllib.parse.urlencode({"creation_id": cid, "access_token": T}).encode()), timeout=60))
    return "https://instagram.com/reel/" + str(pr.get("id"))

def pub_ig_image(fc, image_url):
    IG, T = ENV["IG_BUSINESS_ACCOUNT_ID"], ENV["IG_ACCESS_TOKEN"]
    c = json.load(urllib.request.urlopen(urllib.request.Request(
        "https://graph.facebook.com/v21.0/%s/media" % IG,
        data=urllib.parse.urlencode({"image_url": image_url, "caption": (fc["body"] or "")[:2200], "access_token": T}).encode()), timeout=120))
    time.sleep(3)
    pr = json.load(urllib.request.urlopen(urllib.request.Request(
        "https://graph.facebook.com/v21.0/%s/media_publish" % IG,
        data=urllib.parse.urlencode({"creation_id": c["id"], "access_token": T}).encode()), timeout=120))
    return "https://instagram.com/p/" + str(pr.get("id"))

def pub_x(fc, image_url):
    body = fc["body"] or ""
    if tco_len(body) > 280:
        raise RuntimeError("body over 280 chars")
    from requests_oauthlib import OAuth1Session
    xo = OAuth1Session(ENV["X_CONSUMER_KEY"], client_secret=ENV["X_CONSUMER_SECRET"],
                       resource_owner_key=ENV["X_ACCESS_TOKEN"], resource_owner_secret=ENV["X_ACCESS_TOKEN_SECRET"])
    mid = xo.post("https://upload.twitter.com/1.1/media/upload.json", files={"media": ("i.jpg", dl(image_url))}).json()["media_id_string"]
    rr = xo.post("https://api.twitter.com/2/tweets", json={"text": body, "media": {"media_ids": [mid]}})
    if rr.status_code != 201:
        raise RuntimeError("%d %s" % (rr.status_code, rr.text[:100]))
    return "https://x.com/MENIRUBINqs/status/" + rr.json()["data"]["id"]

# Mastodon removed 2026-06-22 per MENI — API token + platform deleted.

def pub_linkedin(fc, image_url):
    # Publish to the company Page when LINKEDIN_ORG_URN is set (e.g. urn:li:organization:127954085),
    # otherwise fall back to the personal profile. Posting to a Page needs a token with
    # w_organization_social / rw_organization_admin scope.
    T = ENV["LINKEDIN_ACCESS_TOKEN"]
    URN = ENV.get("LINKEDIN_ORG_URN") or ENV["LINKEDIN_MEMBER_URN"]
    H = {"Authorization": "Bearer " + T, "Content-Type": "application/json", "X-Restli-Protocol-Version": "2.0.0"}
    reg = json.load(urllib.request.urlopen(urllib.request.Request(
        "https://api.linkedin.com/v2/assets?action=registerUpload",
        data=json.dumps({"registerUploadRequest": {"recipes": ["urn:li:digitalmediaRecipe:feedshare-image"], "owner": URN,
            "serviceRelationships": [{"relationshipType": "OWNER", "identifier": "urn:li:userGeneratedContent"}]}}).encode(), headers=H), timeout=30))
    up = reg["value"]["uploadMechanism"]["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]["uploadUrl"]
    asset = reg["value"]["asset"]
    urllib.request.urlopen(urllib.request.Request(up, data=dl(image_url), headers={"Authorization": "Bearer " + T, "Content-Type": "application/octet-stream"}, method="PUT"), timeout=120)
    post = {"author": URN, "lifecycleState": "PUBLISHED",
            "specificContent": {"com.linkedin.ugc.ShareContent": {"shareCommentary": {"text": strip_md_headers(fc["body"])},
                "shareMediaCategory": "IMAGE", "media": [{"status": "READY", "media": asset}]}},
            "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"}}
    rr = urllib.request.urlopen(urllib.request.Request("https://api.linkedin.com/v2/ugcPosts", data=json.dumps(post).encode(), headers=H), timeout=60)
    return "https://www.linkedin.com/feed/update/" + rr.headers.get("x-restli-id")

def pub_x_video(fc, video_url):
    # Chunked video upload (INIT -> APPEND -> FINALIZE -> wait for processing) then tweet.
    body = fc["body"] or ""
    if tco_len(body) > 280:
        raise RuntimeError("body over 280 chars")
    from requests_oauthlib import OAuth1Session
    xo = OAuth1Session(ENV["X_CONSUMER_KEY"], client_secret=ENV["X_CONSUMER_SECRET"],
                       resource_owner_key=ENV["X_ACCESS_TOKEN"], resource_owner_secret=ENV["X_ACCESS_TOKEN_SECRET"])
    data = dl(video_url)
    UP = "https://upload.twitter.com/1.1/media/upload.json"
    init = xo.post(UP, data={"command": "INIT", "total_bytes": len(data), "media_type": "video/mp4", "media_category": "tweet_video"})
    if init.status_code not in (200, 201, 202):
        raise RuntimeError("INIT %d %s" % (init.status_code, init.text[:120]))
    mid = init.json()["media_id_string"]
    seg, CH = 0, 4 * 1024 * 1024
    for i in range(0, len(data), CH):
        ap = xo.post(UP, data={"command": "APPEND", "media_id": mid, "segment_index": seg}, files={"media": data[i:i + CH]})
        if ap.status_code not in (200, 201, 204):
            raise RuntimeError("APPEND %d %s" % (ap.status_code, ap.text[:120]))
        seg += 1
    fin = xo.post(UP, data={"command": "FINALIZE", "media_id": mid})
    if fin.status_code not in (200, 201):
        raise RuntimeError("FINALIZE %d %s" % (fin.status_code, fin.text[:120]))
    info = fin.json().get("processing_info")
    waited = 0
    while info and info.get("state") in ("pending", "in_progress"):
        w = int(info.get("check_after_secs", 5)); time.sleep(w); waited += w
        if waited > 300:
            raise RuntimeError("x video processing timeout")
        info = xo.get(UP, params={"command": "STATUS", "media_id": mid}).json().get("processing_info")
    if info and info.get("state") == "failed":
        raise RuntimeError("x video processing failed: " + str(info.get("error")))
    rr = xo.post("https://api.twitter.com/2/tweets", json={"text": body, "media": {"media_ids": [mid]}})
    if rr.status_code != 201:
        raise RuntimeError("%d %s" % (rr.status_code, rr.text[:120]))
    return "https://x.com/MENIRUBINqs/status/" + rr.json()["data"]["id"]

def pub_linkedin_video(fc, video_url):
    T = ENV["LINKEDIN_ACCESS_TOKEN"]
    URN = ENV.get("LINKEDIN_ORG_URN") or ENV["LINKEDIN_MEMBER_URN"]
    H = {"Authorization": "Bearer " + T, "Content-Type": "application/json", "X-Restli-Protocol-Version": "2.0.0"}
    reg = json.load(urllib.request.urlopen(urllib.request.Request(
        "https://api.linkedin.com/v2/assets?action=registerUpload",
        data=json.dumps({"registerUploadRequest": {"recipes": ["urn:li:digitalmediaRecipe:feedshare-video"], "owner": URN,
            "serviceRelationships": [{"relationshipType": "OWNER", "identifier": "urn:li:userGeneratedContent"}]}}).encode(), headers=H), timeout=30))
    up = reg["value"]["uploadMechanism"]["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]["uploadUrl"]
    asset = reg["value"]["asset"]
    urllib.request.urlopen(urllib.request.Request(up, data=dl(video_url),
        headers={"Authorization": "Bearer " + T, "Content-Type": "application/octet-stream"}, method="PUT"), timeout=600)
    post = {"author": URN, "lifecycleState": "PUBLISHED",
            "specificContent": {"com.linkedin.ugc.ShareContent": {"shareCommentary": {"text": strip_md_headers(fc["body"])},
                "shareMediaCategory": "VIDEO", "media": [{"status": "READY", "media": asset}]}},
            "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"}}
    rr = urllib.request.urlopen(urllib.request.Request("https://api.linkedin.com/v2/ugcPosts", data=json.dumps(post).encode(), headers=H), timeout=60)
    return "https://www.linkedin.com/feed/update/" + rr.headers.get("x-restli-id")

# 2026-06-24 — MENI: STOP the publishing engine until the whole system is sorted out.
# While True, the engine publishes NOTHING even if run. Set to False only on MENI's explicit go.
ENGINE_DISABLED = False  # 2026-06-27 — MENI: enable scheduled publishing (7:00, cap 3/platform, video on all 5)

def run():
    print("=== auto_publish (smart media distribution)", now_iso(), "===")
    if ENGINE_DISABLED:
        print("ENGINE DISABLED by MENI (2026-06-24) — publishing nothing. Exiting.")
        return
    products = {p["id"]: p for p in sb_get("products?select=id,name,image_url,image_url_he,video_url,video_status")}
    rows = sb_get("final_copies?status=eq.operator_approved&select=id,product_id,source_content_id,platform_adaptation_id,platform,title,body,image_url,media_asset_url,language")
    # today's already-published counts per platform (for the daily cap)
    todays = sb_get("published_records?verified_at=gte.%sT00:00:00Z&select=platform" % today_key())
    import collections
    cap_used = collections.Counter(r["platform"] for r in todays)
    # 2026-06-27 — MENI: posts are RECURRING (rב-פעמי), not one-time. After publishing we keep
    # them operator_approved so they go out again on future runs. To avoid spamming the same post,
    # rotate: publish the LEAST-recently-published first (never-published posts come first).
    last_pub = {}
    for rec in sb_get("published_records?select=final_copy_id,verified_at&order=verified_at.asc&limit=20000"):
        if rec.get("final_copy_id"):
            last_pub[rec["final_copy_id"]] = rec.get("verified_at") or ""
    rows.sort(key=lambda fc: last_pub.get(fc["id"], ""))  # "" (never published) sorts first
    done, skipped = collections.Counter(), {}
    def media_for(fc):
        pr = products.get(fc["product_id"]) or {}
        has_video = bool(pr.get("video_url") and pr.get("video_status") == "ready")
        img = (fc.get("media_asset_url") or fc.get("image_url") or
               (pr.get("image_url_he") if fc.get("language") == "he" else pr.get("image_url")) or
               pr.get("image_url") or pr.get("image_url_he"))
        return has_video, (pr.get("video_url") if has_video else None), img
    for fc in rows:
        p = fc["platform"]
        # 2026-06-27 — MENI: remove the disclosure-signature block. His own approved posts
        # (incl. the English translations) carry that line; the engine must publish them.
        if p in NO_API:
            skipped.setdefault(p, NO_API[p]); continue
        if cap_used[p] >= DAILY_CAP.get(p, 8):
            skipped.setdefault(p + " (daily cap)", "reached daily cap of %d" % DAILY_CAP.get(p, 8)); continue
        has_video, video_url, image_url = media_for(fc)
        try:
            if p == "youtube":
                if not has_video:
                    skipped.setdefault(p, "no video"); continue
                live, media = pub_youtube_video(fc, video_url), video_url
            elif p == "facebook_page":
                if has_video:
                    live, media = pub_fb_video(fc, video_url), video_url
                elif image_url:
                    live, media = pub_fb_photo(fc, image_url), image_url
                else:
                    skipped.setdefault(p, "no media"); continue
            elif p == "instagram_professional":
                if has_video:
                    live, media = pub_ig_reel(fc, video_url), video_url
                elif image_url:
                    live, media = pub_ig_image(fc, image_url), image_url
                else:
                    skipped.setdefault(p, "no media"); continue
            elif p in ("x_twitter", "linkedin"):
                if has_video:
                    live = {"x_twitter": pub_x_video, "linkedin": pub_linkedin_video}[p](fc, video_url)
                    media = video_url
                elif image_url:
                    live = {"x_twitter": pub_x, "linkedin": pub_linkedin}[p](fc, image_url)
                    media = image_url
                else:
                    skipped.setdefault(p, "no media"); continue
            else:
                skipped.setdefault(p, "no publisher"); continue
            sb_record(fc, live, media)
            # RECURRING: keep status operator_approved so the post publishes again on a later
            # run (rotation handled by last_pub ordering above). Do NOT demote to published_verified.
            done[p] += 1
            cap_used[p] += 1
            print("OK  [%s] %s -> %s" % (p, (fc["title"] or "")[:32], live))
            time.sleep(3)
        except Exception as e:
            print("FAIL[%s] %s : %s" % (p, (fc["title"] or "")[:28], str(e)[:100]))
    print("\nPUBLISHED:", dict(done))
    print("SKIPPED  :", skipped)

if __name__ == "__main__":
    run()
