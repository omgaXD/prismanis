export function wavelengthToRGB(wavelength: number): { r: number; g: number; b: number } {
	let r = 0,
		g = 0,
		b = 0;
	if (wavelength >= 380 && wavelength < 440) {
		r = -(wavelength - 440) / (440 - 380);
		g = 0;
		b = 1;
	} else if (wavelength >= 440 && wavelength < 490) {
		r = 0;
		g = (wavelength - 440) / (490 - 440);
		b = 1;
	} else if (wavelength >= 490 && wavelength < 510) {
		r = 0;
		g = 1;
		b = -(wavelength - 510) / (510 - 490);
	} else if (wavelength >= 510 && wavelength < 580) {
		r = (wavelength - 510) / (580 - 510);
		g = 1;
		b = 0;
	} else if (wavelength >= 580 && wavelength < 645) {
		r = 1;
		g = -(wavelength - 645) / (645 - 580);
		b = 0;
	} else if (wavelength >= 645 && wavelength <= 780) {
		r = 1;
		g = 0;
		b = 0;
	}
	// Intensity correction
	let factor = 0;
	if (wavelength >= 380 && wavelength < 420) {
		factor = 0.3 + (0.7 * (wavelength - 380)) / (420 - 380);
	} else if (wavelength >= 420 && wavelength < 701) {
		factor = 1;
	} else if (wavelength >= 701 && wavelength <= 780) {
		factor = 0.3 + (0.7 * (780 - wavelength)) / (780 - 700);
	}
	r = Math.round(r * factor * 255);
	g = Math.round(g * factor * 255);
	b = Math.round(b * factor * 255);
	return { r, g, b };
}
