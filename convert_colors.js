function oklch_to_rgb(l, c, h) {
    // Convert OKLCH to linear RGB (approximate or use library logic)
    // Since libraries are not available, we use the standard conversion matrix
    // 1. OKLCH -> OKLab
    // L = l, a = c * cos(h), b = c * sin(h)
    const h_rad = h * (Math.PI / 180);
    const L = l;
    const a = c * Math.cos(h_rad);
    const b = c * Math.sin(h_rad);

    // 2. OKLab -> Linear RGB (D65)
    // From https://bottosson.github.io/posts/oklab/
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

    const l_3 = l_ * l_ * l_;
    const m_3 = m_ * m_ * m_;
    const s_3 = s_ * s_ * s_;

    let r = +4.0767416621 * l_3 - 3.3077115913 * m_3 + 0.2309699292 * s_3;
    let g = -1.2684380046 * l_3 + 2.6097574011 * m_3 - 0.3413193965 * s_3;
    let bl = -0.0041960863 * l_3 - 0.7034186147 * m_3 + 1.7076147010 * s_3;

    // 3. Linear RGB -> sRGB (Gamma correction)
    r = r >= 0.0031308 ? 1.055 * Math.pow(r, 1.0 / 2.4) - 0.055 : 12.92 * r;
    g = g >= 0.0031308 ? 1.055 * Math.pow(g, 1.0 / 2.4) - 0.055 : 12.92 * g;
    bl = bl >= 0.0031308 ? 1.055 * Math.pow(bl, 1.0 / 2.4) - 0.055 : 12.92 * bl;

    // Clamp 0-1
    r = Math.min(Math.max(0, r), 1);
    g = Math.min(Math.max(0, g), 1);
    bl = Math.min(Math.max(0, bl), 1);

    // Scale to 0-255
    return [Math.round(r * 255), Math.round(g * 255), Math.round(bl * 255)];
}

const primary = oklch_to_rgb(0.28, 0.106, 264.06);
const secondary = oklch_to_rgb(0.967, 0.001, 286.375);

console.log("Primary RGB:", primary);
console.log("Secondary RGB:", secondary);
