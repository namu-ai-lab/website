import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { parseWebhook, verifySignature } from "./whatsapp";

/* A webhook call shaped as Meta's WhatsApp Cloud API sends it: a voice note, a text, a status and an image. */
const call = {
  object: "whatsapp_business_account",
  entry: [{
    id: "102290129340398",
    changes: [{
      field: "messages",
      value: {
        messaging_product: "whatsapp",
        metadata: { display_phone_number: "22790000000", phone_number_id: "106540352242922" },
        contacts: [{ profile: { name: "Aïcha" }, wa_id: "22790000001" }],
        messages: [
          { from: "22790000001", id: "wamid.A", timestamp: "1730400000", type: "audio", audio: { mime_type: "audio/ogg; codecs=opus", id: "media-1", voice: true } },
          { from: "22790000001", id: "wamid.B", timestamp: "1730400001", type: "text", text: { body: "  Ina CSI mafi kusa?  " } },   // Hausa, NATIVE-REVIEW
          { from: "22790000001", id: "wamid.C", timestamp: "1730400002", type: "image", image: { id: "media-2" } },
        ],
        statuses: [{ id: "wamid.Z", status: "delivered" }],
      },
    }],
  }],
};

describe("WhatsApp webhook", () => {
  const raw = JSON.stringify(call), secret = "app-secret-for-tests";
  const sig = "sha256=" + createHmac("sha256", secret).update(raw).digest("hex");

  it("accepts Meta's signature and refuses anything else", () => {
    expect(verifySignature(raw, sig, secret)).toBe(true);
    expect(verifySignature(raw + " ", sig, secret)).toBe(false);
    expect(verifySignature(raw, sig, "another-secret")).toBe(false);
    expect(verifySignature(raw, sig.replace("sha256=", "sha1="), secret)).toBe(false);
    expect(verifySignature(raw, "sha256=zz", secret)).toBe(false);
    expect(verifySignature(raw, null, secret)).toBe(false);
  });

  it("takes voice notes and texts, and leaves the rest", () => {
    expect(parseWebhook(call)).toEqual([
      { phoneNumberId: "106540352242922", from: "22790000001", id: "wamid.A", kind: "audio", mediaId: "media-1", mime: "audio/ogg; codecs=opus" },
      { phoneNumberId: "106540352242922", from: "22790000001", id: "wamid.B", kind: "text", text: "Ina CSI mafi kusa?" },
    ]);
    expect(parseWebhook({ entry: [{ changes: [{ value: { statuses: [{}] } }] }] })).toEqual([]);
    expect(parseWebhook(null)).toEqual([]);
  });
});
