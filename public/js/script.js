var fov = 70;
var canvasWidth = 320 / 2;
var canvasHeight = 240 / 2;
var vidWidth = 320;
var vidHeight = 240;
var tiltSpeed = 0.1;
var tiltAmount = 0.5;

var perlin = new ImprovedNoise();
var camera, scene, renderer;
var mouseX = 0;
var mouseY = 0;
var keyboard;
var windowHalfX, windowHalfY;
var video, videoTexture;
var world3D;
var geometry;
var vidCanvas;
var ctx;
var pixels;
var max=0;
var averageLightness;
var totalLightness;
var averageLightnessLast;
var totalLightnessLast;
var pixelsLast;
var last = false;
var interval;
var status = false;
var captured = false;
var noisePosn = 0;
var wireMaterial;
var meshMaterial;
var whiteMaterial;
var container;
var params;
var title, info, prompt;


function detectSpecs() {

	//init HTML elements
	container = document.querySelector('#container');
	prompt = document.querySelector('#prompt');
	info = document.querySelector('#info');
	title = document.querySelector('#title');
	info.style.display = 'none';
	title.style.display = 'none';
	container.style.display = 'none';
	init();

}

function init() {

	// stop the user getting a text cursor
	document.onselectstart = function() {
		return false;
	};

	//init control panel
	params = new WCMParams();
	gui = new dat.GUI();
	gui.add(params, 'zoom', 0.1, 5).name('Zoom').onChange(onParamsChange);
	gui.add(params, 'mOpac', 0, 1).name('Mesh Opacity').onChange(onParamsChange);
	gui.add(params, 'wfOpac', 0, 0.3).name('Grid Opacity').onChange(onParamsChange);
	gui.add(params, 'contrast', 1, 5).name('Contrast').onChange(onParamsChange);
	gui.add(params, 'saturation', 0, 2).name('Saturation').onChange(onParamsChange);
	gui.add(params, 'intervalDuration', 0, 300).name('Interval Duration');
	gui.add(params, 'zDepth', 0, 1000).name('Z Depth');
	gui.add(params, 'noiseStrength', 0, 600).name('Noise Strength');
	gui.add(params, 'noiseSpeed', 0, 0.05).name('Noise Speed');
	gui.add(params, 'noiseScale', 0, 0.1).name('Noise Scale');
	gui.add(params, 'invertZ').name('Invert Z');
	//gui.add(this, 'saveImage').name('Snapshot');
	gui.close();
	gui.domElement.style.display = 'none';

	//Init 3D
	scene = new THREE.Scene();
	camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 1, 5000);
	camera.target = new THREE.Vector3(0, 0, 0);
	scene.add(camera);
	camera.position.z = 600;

	//init interval
	interval = 100;

	//init keyboard
	keyboard = new THREEx.KeyboardState();

	//init webcam texture
	video = $('image1');
	videoTexture = new THREE.Texture(video);

	world3D = new THREE.Object3D();
	scene.add(world3D);

	keyboard = new THREEx.KeyboardState();

	//add mirror plane
	geometry = new THREE.PlaneGeometry(640, 480, canvasWidth, canvasHeight);
	geometry.dynamic = true;
	meshMaterial = new THREE.MeshBasicMaterial({
		opacity: 1,
		map: videoTexture
	});
	var mirror = new THREE.Mesh(geometry, meshMaterial);
	world3D.add(mirror);

	//add wireframe plane
	wireMaterial = new THREE.MeshBasicMaterial({
		opacity: 0.1,
		color: 0xffffff,
		wireframe: true,
		blending: THREE.AdditiveBlending,
		transparent: true
	});

	//make whiteMaterial
	whiteMaterial = new THREE.MeshBasicMaterial({
		opacity: 1.0,
		color: 0xffffff,
		blending: THREE.AdditiveBlending,
		transparent: false
	});

	var wiremirror = new THREE.Mesh(geometry, wireMaterial);
	world3D.add(wiremirror);
	wiremirror.position.z = 5;

	//init renderer
	renderer = new THREE.WebGLRenderer({
		antialias: true
	});
	renderer.sortObjects = false;
	renderer.setSize(window.innerWidth, window.innerHeight);
	container.appendChild(renderer.domElement);

	// add Stats
	stats = new Stats();
	document.querySelector('.fps').appendChild(stats.domElement);

	//init vidCanvas - used to analyze the video pixels
	vidCanvas = document.createElement('canvas');
	document.body.appendChild(vidCanvas);
	vidCanvas.style.position = 'absolute';
	vidCanvas.style.display = 'none';
	ctx = vidCanvas.getContext('2d');

	//init listeners
	document.addEventListener('mousemove', onMouseMove, false);
	window.addEventListener('resize', onResize, false);
	document.addEventListener('mousewheel', onWheel, false);
	container.addEventListener('click', hideInfo, false);
	document.querySelector('.closeBtn').addEventListener('click', hideInfo, false);
	title.addEventListener('click', showInfo, false);

	//handle WebGL context lost
	renderer.domElement.addEventListener("webglcontextlost", function(event) {
		prompt.style.display = 'inline';
		prompt.innerHTML = 'WebGL Context Lost. Please try reloading the page.';
	}, false);

	onResize();

	animate();

}

// params for dat.gui

function WCMParams() {
	this.zoom = 1;
	this.mOpac = 1;
	this.wfOpac = 0.1;
	this.contrast = 3;
	this.saturation = 1;
	this.invertZ = false;
	this.zDepth = 400;
	this.noiseStrength = 200;
	this.noiseScale = 0.01;
	this.noiseSpeed = 0.02;
	this.intervalDuration = 100;
	//this.doSnapshot = function() {};
}

function onParamsChange() {
	meshMaterial.opacity = params.mOpac;
	wireMaterial.opacity = params.wfOpac;
	container.style.webkitFilter = "contrast(" + params.contrast + ") saturate(" + params.saturation + ")";
}

function getZDepths() {

	//draw webcam video pixels to canvas for pixel analysis
	//double up on last pixel get because there is one more vert than pixels
	ctx.drawImage(image1, 0, 0, canvasWidth + 1, canvasHeight + 1);
	secondCanvas = document.createElement('canvas');
	document.body.appendChild(secondCanvas);
	secondCanvas.style.position = 'absolute';
	secondCanvas.style.display = 'none';
	ctx2 = secondCanvas.getContext('2d');
	//pixels = ctx.getImageData(0, 0, canvasWidth + 1, canvasHeight + 1).data;
	/*$(document).keydown(function(event) {
	  if (event.which == 71) {
	    pixelsLast=pixels;
		interval = 0;
		last = true;
	   }
	   else if (event.which == 84) {
		last = true;
		status = !status;
		take3DSnap();
	   }
	   else if(event.which == 81){
	   	video.readyState = video.HAVE_ENOUGH_DATA;
	   }
	   else if(event.which == 87){
	   	video.readyState = !video.HAVE_ENOUGH_DATA;
	   }
	});*/
	//ctx.drawImage(image1,0,0); // Or at whatever offset you like
	pixels = ctx.getImageData(0, 0, canvasWidth + 1, canvasHeight + 1).data;
	pixelsLast=ctx2.getImageData(0,0, canvasWidth+1, canvasHeight+1).data;
	for (var i = 0; i < canvasWidth + 1; i++) {
		for (var j = 0; j < canvasHeight + 1; j++) {
			var color = new THREE.Color(getColor(i, j));
			var brightness = getBrightness(color);
			if(true){
				//var HSVDiff = getHSVDifferences(i,j);
				//var HSLDiff = getHSLDifferences(i,j);
				var HSLDiff = getHSLRelDifferences(i,j);
				//var diff = getRGBDifferences(i,j);
				//var color = getRGB(i,j, pixels);
				var colorDepth = HSLDiff.l;
				if(colorDepth>max)
					max=colorDepth;
				//var colorDepth = diff.g/255;
				//var colorDepth = diff.r/255;
			}
			else{
				var  HSVColor = getHSV(i,j);
				var colorDepth = HSVColor.v;
			}
			
			var gotoZ = params.zDepth * -(colorDepth-max) - params.zDepth / 2;

			//add noise wobble
			//gotoZ += perlin.noise(i * params.noiseScale, j * params.noiseScale, noisePosn) * params.noiseStrength;
			//invert?
			if (params.invertZ) gotoZ = -gotoZ;
			//tween to stablize
			geometry.vertices[j * (canvasWidth + 1) + i].z += (gotoZ - geometry.vertices[j * (canvasWidth + 1) + i].z) / 5;
		}
	}
	geometry.verticesNeedUpdate = true;
}

function onMouseMove(event) {
	mouseX = (event.clientX - windowHalfX) / (windowHalfX);
	mouseY = (event.clientY - windowHalfY) / (windowHalfY);
}

function animate() {
	if (video.readyState === video.HAVE_ENOUGH_DATA) {
		videoTexture.needsUpdate = true;
		getZDepths();
	}
	stats.update();
	requestAnimationFrame(animate);
	render();
}

function render() {
	world3D.scale = new THREE.Vector3(params.zoom, params.zoom, 1);
	world3D.rotation.x += ((mouseY * tiltAmount) - world3D.rotation.x) * tiltSpeed;
	world3D.rotation.y += ((mouseX * tiltAmount) - world3D.rotation.y) * tiltSpeed;
	//camera.lookAt(camera.target);
	renderer.render(scene, camera);
}

function onResize() {
	renderer.setSize(window.innerWidth, window.innerHeight);
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	windowHalfX = window.innerWidth / 2;
	windowHalfY = window.innerHeight / 2;
}

// Returns a hexidecimal color for a given pixel in the pixel array.

function getColor(x, y) {
	var base = (Math.floor(y) * (canvasWidth + 1) + Math.floor(x)) * 4;
	var c = {
		r: pixels[base + 0],
		g: pixels[base + 1],
		b: pixels[base + 2],
		a: pixels[base + 3]
	};
	return (c.r << 16) + (c.g << 8) + c.b;
}
function getRGB(x, y, array) {
	var base = (Math.floor(y) * (canvasWidth + 1) + Math.floor(x)) * 4;
	var c = {
		r: array[base + 0],
		g: array[base + 1],
		b: array[base + 2],
		a: array[base + 3]
	};
	return {
		r: c.r,
		g: c.g,
		b: c.b
	};
}

function getHSV(x,y, array){
	var base = (Math.floor(y) * (canvasWidth + 1) + Math.floor(x)) * 4;
	var c = {
		r: array[base + 0],
		g: array[base + 1],
		b: array[base + 2],
		a: array[base + 3]
	};
	return getHSVfromRGB(c.r,c.g,c.b);
}
function getHSL(x,y, array){
	var base = (Math.floor(y) * (canvasWidth + 1) + Math.floor(x)) * 4;
	var c = {
		r: array[base + 0],
		g: array[base + 1],
		b: array[base + 2],
		a: array[base + 3]
	};
	return getHSLfromRGB(c.r,c.g,c.b);
}

function getHSVDifferences(x,y){
	first = getHSV(x,y,pixelsLast);
	last = getHSV(x,y, pixels);
	return {
		h: last.h-first.h,
		s: first.s-last.s,
		v: first.v-last.v
	};
}

function getHSLDifferences(x,y){
	first = getHSL(x,y,pixelsLast);
	last = getHSL(x,y, pixels);
	return {
		h: (last.h-first.h)/first.h,
		s: (first.s-last.s)/first.s,
		l: last.l-first.l
	};
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
function getRGBDifferences(x,y){
	first = getRGB(x,y,pixels);
	last = getRGB(x,y,pixelsLast);
	return {
		r: first.r-last.r,
		g: first.g-last.g,
		b: first.b-last.b
	};
}

//return pixel brightness between 0 and 1 based on human perceptual bias

function getBrightness(c) {
	return (0.34 * c.r + 0.5 * c.g + 0.16 * c.b);
}

function hideInfo() {
	info.style.display = 'none';
	title.style.display = 'inline';
}

function showInfo() {
	info.style.display = 'inline';
	title.style.display = 'none';
}

function onWheel(event) {

	params.zoom += event.wheelDelta * 0.002;
	//limit
	params.zoom = Math.max(params.zoom, 0.1);
	params.zoom = Math.min(params.zoom, 5);

	//update gui slider
	gui.__controllers[0].updateDisplay();
}

function saveImage() {
	render();
	window.open(renderer.domElement.toDataURL("image/png"));
}

function take3DSnap(){
	setTimeout(
		function(){
			$('#overlay').css("opacity",1.0);
			console.log("just changed dat opacity");
			pixels = ctx.getImageData(0, 0, canvasWidth + 1, canvasHeight + 1).data;

		},
	10);
	setTimeout(
		function(){
			$('#overlay').css("opacity",0);	
			console.log("just changed dat opacity");

		},
	60);
}

function calculateAverages(){
	for (var i = 0; i < canvasWidth + 1; i++) {
		for (var j = 0; j < canvasHeight + 1; j++) {
			totalLightness+=getHSL(i,j,pixels);
			totalLightnessLast+=getHSL(i,j,pixelsLast);
		};
	};
	averageLightness=totalLightness/(canvasWidth*canvasHeight);
	console.log(averageLightness+"averagelightness");
	averageLightnessLast=totalLightnessLast/(canvasWidth*canvasHeight);
	console.log(averageLightnessLast+"averagelightnessLast");
}

//start the show
detectSpecs();


getHSVfromRGB = function(r,g,b)
{
    var rr, gg, bb,
        h, s,
        v = Math.max(r, g, b),
        diff = v - Math.min(r, g, b),
        diffc = function(c)
        {
            return (v - c) / 6 / diff + 1 / 2;
        };

    if (diff == 0) {
        h = s = 0;
    } else {
        s = diff / v;
        rr = diffc(r);
        gg = diffc(g);
        bb = diffc(b);

        if (r === v) {
            h = bb - gg;
        } else if (g === v) {
            h = (1 / 3) + rr - bb;
        } else if (b === v) {
            h = (2 / 3) + gg - rr;
        }
        if (h < 0) {
            h += 1;
        } else if (h > 1) {
            h -= 1;
        }
    }
    return {
        h: h,
        s: s,
        v: v
    };
};
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

function getParameterByName(name)
{
  name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
  var regexS = "[\\?&]" + name + "=([^&#]*)";
  var regex = new RegExp(regexS);
  var results = regex.exec(window.location.search);
  if(results == null)
    return "";
  else
    return decodeURIComponent(results[1].replace(/\+/g, " "));
}