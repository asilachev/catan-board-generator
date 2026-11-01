# Included in every location (nginx doesn't inherit add_header into locations that set their own).
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "no-referrer" always;
add_header X-Frame-Options "DENY" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
# blob: and data: images: "Save PNG" draws the board into a canvas through an image.
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; manifest-src 'self'; worker-src 'self'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'" always;
# The app is a tool; the landing page is its public face, so search engines skip the app.
# vercel.ts sends the same headers.
add_header X-Robots-Tag "noindex" always;
