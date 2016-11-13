"use strict"; // good practice - see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode

/*global THREE, Stats */

// if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

var path = "";	// STUDENT: set to "" to run on your computer, "/" for submitting code to Udacity

var camera, scene, renderer, stats;
var timestep = 0;
var cameraControls, effectController;
var clock = new THREE.Clock();
var textureLoader = new THREE.TextureLoader();
var slpGeometry, ctnGeometry;
var alldata;
var light;
var n;
var t = 0;
var newTime = 0, oldTime = 0;
var legendGroup = new THREE.Object3D();
//lookup table
var lut = new THREE.Lut( "matlab", 64 );
lut.setMax( 12 );
lut.setMin( 0 );
//
var lambertMaterial = new THREE.MeshLambertMaterial({ vertexColors: THREE.VertexColors });
var basicMaterial = new THREE.MeshBasicMaterial({ vertexColors: THREE.VertexColors });
var slpMesh,ctnMesh;
//timer
var timer;

$(document).on({
    ajaxStart: function() { $("body").addClass("loading"); },
    ajaxStop: function() { $("body").removeClass("loading"); }    
});

function init() {
	scene = new THREE.Scene();

	var canvasWidth = window.innerWidth;
	var canvasHeight = window.innerHeight;
	var canvasRatio = canvasWidth / canvasHeight;

	// RENDERER
	renderer = new THREE.WebGLRenderer( { antialias: true } );
	// renderer.gammaInput = true;
	// renderer.gammaOutput = true;
	renderer.setPixelRatio( window.devicePixelRatio );

	renderer.setSize(canvasWidth, canvasHeight);
	renderer.setClearColor( 0xf0f0f0 );

	var container = document.getElementById('container');
	container.appendChild( renderer.domElement );
	//info
	var info = document.createElement( 'div' );
	info.style.position = 'absolute';
	info.style.top = '10px';
	info.style.width = '100%';
	info.style.textAlign = 'center';
	info.innerHTML = 'CFD simulation of mudflow flume test<br>Visualization with <a href="http://threejs.org" target="_blank">three.js</a><br>\
	<strong>Drag</strong> to rotate, <strong>scroll</strong> to zoom\
	<br><strong>light</strong>: lighting direction\
	<br><strong>colormap</strong>: Color by depth';
	container.appendChild( info );

	// STATS
	stats = new Stats();
	stats.domElement.style.position = 'absolute';
	stats.domElement.style.top = '0px';
	stats.domElement.style.zIndex = 100;
	container.appendChild( stats.domElement );
	stats.domElement.children[ 0 ].children[ 0 ].style.color = "#aaa";
	stats.domElement.children[ 0 ].style.background = "transparent";
	stats.domElement.children[ 0 ].children[ 1 ].style.display = "none";
	
	camera = new THREE.PerspectiveCamera( 1, canvasRatio, 1, 1000 );
	camera.up = new THREE.Vector3( 0, 0, 1 )
	camera.position.set( 95, -40, 80 );

	// camera = new THREE.OrthographicCamera( -1,1,1,-1, 500, -500 );
	// camera.up = new THREE.Vector3( 0, 0, 1 )
	// camera.position.set( 1,-1,1 );
	// camera.lookAt( scene.position );

	// CONTROLS
	cameraControls = new THREE.OrbitControls(camera, renderer.domElement);
	cameraControls.target.set(0,0,0);

	// light
	var ambientLight = new THREE.AmbientLight( 0xffffff );
	scene.add( ambientLight );

	light = new THREE.DirectionalLight( 0xffffff, 1.0 );
	light.position.set( 1, 0, 1 );
	scene.add( light );
	
	setupGui();
	drawflume();
	// drawGrid();
	initMesh();
	window.addEventListener( 'resize', onWindowResize, false );
}

function setupGui() {

	effectController = {
		pause: false,
		colormap:false,
		fps: 10,

		//light
		lx: 0.32,
		ly: 0.39,
		lz: 0.7,

		Hue:    0.1,
		Saturation: 0.1,
		Lightness:    0.4
	};

	var gui = new dat.GUI();
	// material (attributes)
	gui.add( effectController, "pause" );
	gui.add( effectController, "colormap" ).name("colormap");

	gui.add( effectController, "fps", 1.0,10.0).step(1.0).name("Frame rate");
	
	// material (color)
	// gui.add( effectController, "Hue", 0.0, 1.0 );
	// gui.add( effectController, "Saturation", 0.0, 1.0 );
	// gui.add( effectController, "Lightness", 0.0, 1.0 );
	//light 

	gui.add( effectController, "lx", 0, 1.0, 0.025 ).name("light.x");
	gui.add( effectController, "ly", -1.0, 1.0, 0.025 ).name("light.y");
	gui.add( effectController, "lz", 0, 1.0, 0.025 ).name("light.z");

}

function drawflume(){
	var flumeMaterial = new THREE.MeshBasicMaterial( {color:0xD3D3D3,side: THREE.DoubleSide } );
	var slopeL = 1.5;
	var slopeW = 0.2;
	var angle = 14;
	var slope = new THREE.Mesh( new THREE.PlaneGeometry( slopeL,slopeW), flumeMaterial );
	slope.rotation.y = angle* Math.PI /180;
	slope.position.set( -slopeL* Math.cos(angle* Math.PI /180)/2, 0 , slopeL * Math.sin(angle* Math.PI /180)/2 + 0.001);
	scene.add( slope );
	// container
	var container = new THREE.Mesh( new THREE.PlaneGeometry(1,1), flumeMaterial );
	container.position.set( 0.5, 0 , 0.002 );
	scene.add( container );
	// //axis
	// var axisHelper = new THREE.AxisHelper( 1 );
	// scene.add( axisHelper );
}


function drawGrid(){
	// grid
	var size = 1, step = 0.1;
	var gridGeometry = new THREE.Geometry();
	for ( var i = - size; i <= size; i += step ) {
		gridGeometry.vertices.push( new THREE.Vector3( - size, i, 0 ) );
		gridGeometry.vertices.push( new THREE.Vector3(   size, i, 0 ) );
		gridGeometry.vertices.push( new THREE.Vector3( i,- size,0 ) );
		gridGeometry.vertices.push( new THREE.Vector3( i, size,0 ) );
	}
	var material = new THREE.LineBasicMaterial( { color: 0x000000, opacity: 0.2 } );
	var line = new THREE.LineSegments( gridGeometry, material );
	scene.add( line );
}

$.ajax({
	url: 'https://dl.dropboxusercontent.com/s/dy610iglj2yyjmw/CFDdata.json?dl=0',//remote
	// url: 'meshdata.json',//local
	dataType: 'json',
	success: function (data) {
				alldata = data;
				init();
			},
	complete: function (data){
		animate();
	}
})


function animate() {
	window.requestAnimationFrame(animate);
	render();
}

function updateT() {
	if (t < 30) {
		t++;
	} else {
		t = 0;
	}
}

function updateScene(){
	
	light.position.set( effectController.lx, effectController.ly, effectController.lz );
	// color upate
	if (effectController.colormap == false){
		legendGroup.visible = false;
		var colorValue = new THREE.Color();
		colorValue.setHSL( effectController.Hue, effectController.Saturation, effectController.Lightness);
		updateGeo(slpGeometry,alldata.data.slp,t,colorValue);
		updateGeo(ctnGeometry,alldata.data.ctn,t,colorValue);
		slpMesh.material = lambertMaterial;
		ctnMesh.material = lambertMaterial;

	} else{
		legendGroup.visible = true;
		updateGeo(slpGeometry,alldata.data.slp,t,lut);
		updateGeo(ctnGeometry,alldata.data.ctn,t,lut);
		slpMesh.material = basicMaterial;
		ctnMesh.material = basicMaterial;
	}
	
	scene.remove(timer);
	timer = spriteTimer(t);
	scene.add(timer);

}

function initMesh(){
	slpGeometry = construtGeo(alldata.data.slp,0);
	ctnGeometry = construtGeo(alldata.data.ctn,0);
	slpMesh = new THREE.Mesh(slpGeometry, lambertMaterial);
	ctnMesh = new THREE.Mesh(ctnGeometry, lambertMaterial);
	slpMesh.rotateY(14*Math.PI/180);
	scene.add(slpMesh);
	scene.add(ctnMesh);

	var legend = lut.setLegendOn({'layout':'horizontal','position': { 'x': 0.5, 'y': 1, 'z': 0.002 },'dimensions':{'width': 0.1, 'height': 0.5} } );
	legendGroup.add(legend);					
	var labels = lut.setLegendLabels( { 'title': 'Depth', 'um': 'mm', 'ticks': 5 , 'fontsize': 20,'decimal':1} );
	legendGroup.add ( labels['title'] );
	for ( var i = 0; i < Object.keys( labels[ 'ticks' ] ).length; i++ ) {
		legendGroup.add ( labels[ 'lines' ][ i ] );
		legendGroup.add ( labels[ 'ticks' ][ i ] );
	}
	legendGroup.visible = false;
	scene.add(legendGroup);

	timer = spriteTimer(t);
	scene.add(timer);

}

function spriteTimer(t) {
	var canvasTitle = document.createElement( 'canvas' );
	var contextTitle = canvasTitle.getContext( '2d' );
	t = t/10;
	contextTitle.font = 'Normal 20px Arial';		
	contextTitle.fillText( "t = "+t.toString()+"s", canvasTitle.width/2, canvasTitle.height/2 );

	var txtTitle = new THREE.CanvasTexture( canvasTitle );
	txtTitle.minFilter = THREE.LinearFilter;
	var spriteMaterialTitle = new THREE.SpriteMaterial( { map: txtTitle } );
	var spriteTitle = new THREE.Sprite( spriteMaterialTitle );
	spriteTitle.scale.set( 2/2, 1/2, 1/2);
	spriteTitle.position.set( 1.0, 0.6, 0.0);
	return spriteTitle;
}

function render() {
	var delta = clock.getDelta();
	cameraControls.update( delta );
	renderer.render( scene, camera );

	if (!effectController.pause){
		newTime += delta;
		if ( newTime > oldTime + 0.95/effectController.fps ) {
			oldTime = newTime;
			updateT();
			updateScene();
			stats.update();
		}
	}
	stats.update();
}


function construtGeo(xyzData,t){
	var geometry = new THREE.BufferGeometry();	
	var n = xyzData.x.length;
	var k=0;
	var vertices = new Float32Array(3*n);
	var color = new Float32Array(3*n);
	var height = new Float32Array(3*n);

	var indices = Uint32Array.from(xyzData.face);
	var colorValue = new THREE.Color(0xffffff );
		colorValue.setHSL(0.1,0.1,0.3)
	for ( var i = 0; i < n; i ++ ) {
		var h = xyzData.z[t][i] * 1000;
		vertices[k]=xyzData.x[i];
			color[k]= colorValue.r;
				height[k] = h;
		k++;
		vertices[k]=xyzData.y[i];
			color[k]= colorValue.g;
				height[k] = h;
		k++;
		vertices[k]=xyzData.z[t][i];
			color[k]= colorValue.b;
				height[k] = h;
		k++;
	} 
	geometry.addAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
	geometry.addAttribute( 'height', new THREE.BufferAttribute( vertices, 3 ) );
	geometry.setIndex( new THREE.BufferAttribute( indices, 1 ) );
	geometry.addAttribute( 'color', new THREE.BufferAttribute( color, 3 ) );
	geometry.computeVertexNormals();
	geometry.normalizeNormals();
	return geometry;
}

function updateGeo(geo,xyzData,t,color){
	//lut is the colormap
	var n = xyzData.x.length;
	for ( var i = 0; i < n; i++) {
		var h = xyzData.z[t][i] * 1000;
		var colorValue;
		if (color.isColor) {
			colorValue = color
		}  else{
			colorValue = lut.getColor(h);
		} 
		geo.attributes.position.array[i*3+2]=xyzData.z[t][i];
		geo.attributes.color.array[i*3]=colorValue.r;
		geo.attributes.color.array[i*3+1]=colorValue.g;
		geo.attributes.color.array[i*3+2]=colorValue.b;
		} 

	geo.attributes.position.needsUpdate = true;
	geo.attributes.color.needsUpdate = true;
	geo.computeVertexNormals();
	geo.normalizeNormals();
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
	render();
}

