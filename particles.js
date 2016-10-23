"use strict"; // good practice - see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode
////////////////////////////////////////////////////////////////////////////////
// Particle System
////////////////////////////////////////////////////////////////////////////////

/*global THREE, Stats */

//if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

var path = "";	// STUDENT: set to "" to run on your computer, "/" for submitting code to Udacity

var camera, scene, renderer, stats
var alldata;
var group = new THREE.Group();
var timestep = 0;
var Lparticles, Sparticles;
var cameraControls, effectController;
var clock = new THREE.Clock();
var textureLoader = new THREE.TextureLoader();
var mapC = textureLoader.load( "ball.png" );
var newTime = 0, oldTime = 0;
var t=0;
var timer;
var Sgeometry = new THREE.Geometry();
var Lgeometry = new THREE.Geometry();

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
	renderer.gammaInput = true;
	renderer.gammaOutput = true;
	renderer.setSize(canvasWidth, canvasHeight);
	renderer.setClearColor( 0xf0f0f0 );

	var container = document.getElementById('container');
	container.appendChild( renderer.domElement );

	// STATS
	stats = new Stats();
	stats.domElement.style.position = 'absolute';
	stats.domElement.style.top = '0px';
	stats.domElement.style.zIndex = 100;
	container.appendChild( stats.domElement );
	stats.domElement.children[ 0 ].children[ 0 ].style.color = "#aaa";
	stats.domElement.children[ 0 ].style.background = "transparent";
	stats.domElement.children[ 0 ].children[ 1 ].style.display = "none";
	
	// CAMERA
	camera = new THREE.PerspectiveCamera( 1, canvasRatio, 0.1, 1000 );
	camera.up = new THREE.Vector3( 0, 0, 1 )
	camera.position.set( 60, -60, 40 );

	// CONTROLS
	cameraControls = new THREE.OrbitControls(camera, renderer.domElement);
	cameraControls.target.set(-0.1,0,0);

	timer = spriteTimer(t);
	scene.add(timer);
	window.addEventListener( 'resize', onWindowResize, false );
	drawGrid();
	setupGui();
	drawflume();
	particleInit();
}


function setupGui() {
	effectController = {
		pause: false,
		fps: 10
	};

	var gui = new dat.GUI();
	// material (attributes)
	gui.add( effectController, "pause" );
	gui.add( effectController, "fps", 1.0,10.0).step(1.0);

}

function drawGrid() {
	// grid
	var size = 1, step = 0.1;
	var gridGeometry = new THREE.Geometry();
	for ( var i = - size; i <= size; i += step ) {
		gridGeometry.vertices.push( new THREE.Vector3( - size, i, 0 ) );
		gridGeometry.vertices.push( new THREE.Vector3(   size, i, 0 ) );
		gridGeometry.vertices.push( new THREE.Vector3( i,- size,0 ) );
		gridGeometry.vertices.push( new THREE.Vector3( i, size,0 ) );
	}
	var material = new THREE.LineBasicMaterial( { color: 0x000000, opacity: 1 } );
	var line = new THREE.LineSegments( gridGeometry, material );
	scene.add( line );
		//axis
	var axisHelper = new THREE.AxisHelper( 2 );
	scene.add( axisHelper );
}

function drawflume(){
	var flumeMaterial = new THREE.MeshBasicMaterial( {color:0x708090,side: THREE.DoubleSide } );
	var slopeL = 1.2;
	var slope = new THREE.Mesh( new THREE.PlaneGeometry( slopeL,0.06), flumeMaterial );
	slope.rotation.y = 20* Math.PI /180;
	slope.position.set( -slopeL* Math.cos(20* Math.PI /180)/2, 0 , slopeL * Math.sin(20* Math.PI /180)/2);
	scene.add( slope );
	// container
	var container = new THREE.Mesh( new THREE.PlaneGeometry( 0.5,0.5), flumeMaterial );
	container.position.set(0.25,0,0);
	scene.add( container );
	//slope sidewall

}

$.ajax({
	 // url: 'https://dl.dropboxusercontent.com/s/47t1zbfskt9eqcn/DEMdata.json?dl=0',//remote
	url: 'data.json',//local
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

function particleInit(){
	t = 10;
	var n = alldata.timedata[t].x.length;
	for ( var i = 0; i < n; i ++ ) {
		var vertex = new THREE.Vector3();
		vertex.x = alldata.timedata[t].x[i];
		vertex.y = alldata.timedata[t].y[i];
		vertex.z = alldata.timedata[t].z[i];
		(alldata.timedata[t].r[i] >= 0.003)? Lgeometry.vertices.push( vertex ): Sgeometry.vertices.push( vertex );
	}
	var Smaterial = new THREE.PointsMaterial( { size: 0.5, map: mapC, color: 0x4682B4,
		alphaTest: 0.5, depthTest: true, transparent : true} );
	var Lmaterial = new THREE.PointsMaterial( { size: 1, map: mapC, color: 0xB22222, 
		alphaTest: 0.5, depthTest: true, transparent : true} );

	Lparticles = new THREE.Points(Lgeometry,Lmaterial);
	Sparticles = new THREE.Points(Sgeometry,Smaterial);

	group.add(Lparticles);
	group.add(Sparticles);
	scene.add(group);

}

function updateScene(t){
	var n = alldata.timedata[t].x.length;
var kL = 0;
var kS = 0;
	for ( var i = 0; i < n; i ++ ) {
		if (alldata.timedata[t].r[i] >= 0.003) {
			Lgeometry.vertices[kL].x = alldata.timedata[t].x[i];
			Lgeometry.vertices[kL].y = alldata.timedata[t].y[i];
			Lgeometry.vertices[kL].z = alldata.timedata[t].z[i];
			kL++;
		}else{
			Sgeometry.vertices[kS].x = alldata.timedata[t].x[i];
			Sgeometry.vertices[kS].y = alldata.timedata[t].y[i];
			Sgeometry.vertices[kS].z = alldata.timedata[t].z[i];
			kS++;
		}
	}

	Sgeometry.verticesNeedUpdate = true;
	Lgeometry.verticesNeedUpdate = true;

	scene.remove(timer);
	timer = spriteTimer(t);
	scene.add(timer);
}

function updateT(t) {
	if (t < 99) {
		t++;
	} else {
		t = 0;
	}
	return t;
}

function render() {
	var delta = clock.getDelta();
	cameraControls.update( delta );
	renderer.render( scene, camera );
	if (!effectController.pause){
		newTime += delta;
		if ( newTime > oldTime + 0.95/effectController.fps ) {
			oldTime = newTime;
			timestep = updateT(timestep);
			updateScene(timestep);
			stats.update();
		}
	}
		
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
	render();
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



