//two pixel arrays, pixels and pixelsLast

for (var i = 0; i < canvasWidth + 1; i++) {
	for (var j = 0; j < canvasHeight + 1; j++) {
		var color = new THREE.Color(getColor(i, j));
		var brightness = getBrightness(color);
		var HSLDiff = getHSLRelDifferences(i,j);
		var colorDepth = HSLDiff.l;
		if(colorDepth>max)
			max=colorDepth;
		var gotoZ = params.zDepth * colorDepth - params.zDepth / 2;

		if (params.invertZ) gotoZ = -gotoZ;
		//tween to stabilize the jaunt
		geometry.vertices[j * (canvasWidth + 1) + i].z += (gotoZ - geometry.vertices[j * (canvasWidth + 1) + i].z) / 5;
	}
}

function getHSLRelDifferences(x,y){
	if(isNaN(averageLightness)){
		first = getHSL(x,y,pixels);
		last = getHSL(x,y,pixelsLast);
	}
	else{
		first = getHSL(x,y,pixels)/averageLightness;
		last = getHSL(x,y, pixelsLast)/averageLightnessLast;
	}
	return {
		h: last.h-first.h,
		s: last.s-first.s,
		l: last.l-first.l
	};
}

function getHSLfromRGB(r, g, b){
    r /= 255, g /= 255, b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;

    if(max == min){
        h = s = 0; // achromatic
    }else{
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch(max){
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return {
        h: h,
        s: s,
        l: l
    };
}
