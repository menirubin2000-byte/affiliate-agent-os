import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const product = {
  name: "FIFINE AmpliTank TANK6S Vocal Dynamic Microphone",
  slug: "fifine-amplitank-tank6s-vocal-dynamic-microphone",
  brand: "FIFINE",
  category: "Microphones / Dynamic Microphone",
  affiliate_url: "https://amzn.to/4ohfkrP",
  price: 124.99,
  commission_rate: 0,
  status: "active",
  image_url: null,
  image_status: "missing",
  notes: JSON.stringify({
    marketplace: "amazon.com",
    price_usd: 124.99,
    shipping_import_to_il_usd: 34.61,
    shipping_usd: 0,
    estimated_total_to_il_usd: 159.60,
    shipping_status: "ships_to_israel",
    shipping_region: "US_TO_ISRAEL",
    advertising_region: "ISRAEL",
    is_publish_ready_for_il: true,
    rating: 4.8,
    review_count: 33,
    seller: "FIFINE Store",
    ships_from: "Amazon",
    product_score: 7.5,
    target_audience: "podcasters, streamers, content creators, music recording, voice-over artists",
    notes_he: "מיקרופון דינמי XLR/USB עם סטנד שולחני מתכוונן, כפתור Mute עם LED, גוף מתכת מלא. מחיר סביר, משלוח חינם לישראל. דירוג 4.8 — ביקורות מעטות עדיין אבל מבטיח.",
    image_source: "placeholder_until_api_or_approved_manufacturer_asset",
    sustainability_features: 3,
    key_features: {
      dual_interface: "Supports both XLR and USB connections — switch between studio-grade XLR output and convenient USB plug-and-play in seconds. No adapters needed, works seamlessly with professional audio interfaces and direct PC/Mac setups alike.",
      audio_quality: "Dynamic capsule with 192kHz sampling rate delivers rich vocal reproduction with detailed high-frequency response. 70dB signal-to-noise ratio keeps your voice clean and prominent even in less-than-ideal recording environments. Best results when positioned 5-15cm from the sound source (end-address pattern).",
      noise_rejection: "Multi-layered internal noise isolation design minimizes room reflections and ambient sounds. The dynamic element naturally rejects off-axis noise, producing polished audio without heavy post-processing.",
      physical_controls: "Dedicated mute button with red LED status indicator prevents on-air mistakes. Separate gain dial and headphone volume knob allow real-time adjustments with zero-latency monitoring — essential for live broadcasts and podcast interviews.",
      adjustable_stand: "All-metal desktop stand with height and tilt adjustment positions the mic at optimal recording angle. Heavy base provides solid stability without desk vibration transfer.",
      included_kit: "Ships with USB-A to USB-A/C cable and the adjustable metal stand. Full metal construction throughout for durability and reduced handling noise."
    }
  })
};

const { data, error } = await supabase
  .from("products")
  .insert(product)
  .select("id, name, status")
  .single();

if (error) {
  console.error("Insert failed:", error.message);
  process.exit(1);
}

console.log("Product added:", JSON.stringify(data, null, 2));
