# Third-party service inventory

Thirteen services or hooks are identified: eleven confirmed public services and two source-only hooks. This does not establish licensed access, credentials, or working submission delivery.

| Service | Purpose | Domain | Evidence/status | Rebuild handling |
| --- | --- | --- | --- | --- |
| DealerSync | Site platform, inventory hosting, public forms, CDN, accessibility controls | dealersync.com | Header/footer/HTML and forms; confirmed | Production requires dealer platform/feed/CRM agreement; demo uses snapshot |
| RouteOne | Credit application, English and Spanish | routeone.net | Finance application iframes and loaded browser interface; confirmed | Provider integration required in production; informational placeholder in demo |
| Capital One | Prequalification and vehicle financing estimate tools | auto-digital-retail.capitalone.com | Finance page, SRP/VDP loader and rendered interface; confirmed | Dealer-approved token/account and provider flow; never copy token into demo |
| CARFAX | History reports and snapshots | carfax.com | Rendered Acura VDP snapshot, report link, source widgets; confirmed | Licensed vehicle report links/service; no invented history badges |
| Monroney Labels | Factory window sticker | monroneylabels.com | VDP source images/links; confirmed | Retain supported sticker slot; commercial access/rights require confirmation |
| AutoDriven | External Shop From Home inventory/retail experience | autodriven.com | Homepage overflow nav; loaded external interface; confirmed | Separate provider/checkout; do not reproduce connected purchase behavior in demo |
| Google Maps | Embedded location and directions | google.com / maps.googleapis.com | Homepage/contact/footer iframe and links; confirmed | Directions link works as public link; map key/account required for new embed |
| Google Analytics 4 | Analytics | googletagmanager.com / google-analytics.com | gtag script and G-CPW9T29BZY tracking reference; confirmed | Disable in demo; new owner-approved account in production |
| Google Translate | Language selection | translate.google.com | Inline loader plus rendered Select Language; confirmed | Recommend explicit edited Spanish for core pages rather than relying entirely on auto translation |
| YouTube | Carfam commercial embed and social link | youtube.com | Sell My Car video K49v9drRQw8; confirmed | Optional click-to-load video; no autoplay required |
| Edmunds | External news headlines | edmunds.com | /news source labels and linked headlines; confirmed | Optional outbound resource feed; not original Carfam article content |
| ShareThis | Vehicle share widget hook | sharethis (source data-network) | VDP st-custom-button data-network attribute; source_hook_only | Loaded provider script not verified; native share/copy link can replace |
| reCAPTCHA | Verification containers in lead forms | Google reCAPTCHA (markup reference) | VDP ds-recaptcha form containers; source_hook_only | Activation not verified; choose approved spam protection for production |

AutoCheck template markup is present but the page advertises `data-has-autocheck=false`; it is not counted as a confirmed active service. No specific CRM vendor, licensed inventory API, appraisal valuation provider, email delivery recipient, or backend credentials were identified. Native SMS and social-profile links are conversions/outbound references rather than additional backend integrations.

Public map/client embed keys and ephemeral form tokens are redacted from copied evidence. They must not be reused in a new project.