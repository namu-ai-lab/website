import { describe, expect, it } from "vitest";
import { visitorBucket } from "@/lib/ip";

/* The demo's per-visitor limit: one IPv6 host holds a whole /64, so it is counted as one visitor. The strings must be
   the ones the gateway's address_bucket makes (Python's ipaddress), or the two would count the same visitor twice. */
describe("visitorBucket", () => {
  it("keeps an IPv4 address as it is", () => {
    expect(visitorBucket("203.0.113.7")).toBe("203.0.113.7");
    expect(visitorBucket("::ffff:203.0.113.7")).toBe("203.0.113.7");
  });

  it("counts every address of one IPv6 /64 as one visitor", () => {
    expect(visitorBucket("2001:db8:1:2::1")).toBe("2001:db8:1:2::/64");
    expect(visitorBucket("2001:db8:1:2:ffff:ffff:ffff:fffe")).toBe("2001:db8:1:2::/64");
    expect(visitorBucket("2001:0DB8:0001:0002:0000:0000:0000:0001")).toBe("2001:db8:1:2::/64");
    expect(visitorBucket("[2001:db8:1:2::1]")).toBe("2001:db8:1:2::/64");
    expect(visitorBucket("2001:db8:1:3::1")).toBe("2001:db8:1:3::/64");
  });

  it("writes the /64 as Python's ipaddress does", () => {
    expect(visitorBucket("2001:db8::1")).toBe("2001:db8::/64");
    expect(visitorBucket("2001:0:db8:0::5")).toBe("2001:0:db8::/64");
    expect(visitorBucket("1::2:3:4:5:6:7")).toBe("1:0:2:3::/64");
    expect(visitorBucket("64:ff9b::192.0.2.33")).toBe("64:ff9b::/64");
    expect(visitorBucket("fe80::1%eth0")).toBe("fe80::/64");
  });

  it("passes on anything that is not an address", () => {
    expect(visitorBucket("unknown")).toBe("unknown");
    expect(visitorBucket("2001:db8:::1")).toBe("2001:db8:::1");
  });
});
