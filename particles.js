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
var Sgeometry, Lgeometry;

var legendGroup = new THREE.Object3D();
var lut = new THREE.Lut( "rainbow", 64 );
lut.setMax( 2.1 );
lut.setMin( 0 );

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
	info.innerHTML = 'DEM simulation of finite volume dry granular flow<br>Visualization with <a href="http://threejs.org" target="_blank">three.js</a>\
	<br><strong>Drag</strong> to rotate, <strong>scroll</strong> to zoom,\
	<strong>colormap</strong>: Color by velocity';
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
	// drawGrid();
	setupGui();
	drawflume();
	particleInit();
}


function setupGui() {
	effectController = {
		pause: false,
		colormap:false,
		fps: 10
	};

	var gui = new dat.GUI();
	gui.add( effectController, "pause" );
	gui.add( effectController, "fps", 1.0,10.0).step(1.0);
	gui.add( effectController, "colormap" ).name("colormap");;
}

function drawGrid() {
	// grid
	var size = 0.25, step = 0.1;
	var gridGeometry = new THREE.Geometry();
	for ( var i = - size; i <= size; i += step ) {
		gridGeometry.vertices.push( new THREE.Vector3( - size, i, 0 ) );
		gridGeometry.vertices.push( new THREE.Vector3(   size, i, 0 ) );
		gridGeometry.vertices.push( new THREE.Vector3( i,- size,0 ) );
		gridGeometry.vertices.push( new THREE.Vector3( i, size,0 ) );
	}
	var material = new THREE.LineBasicMaterial( { color: 0x000000, opacity: 1 } );
	var line = new THREE.LineSegments( gridGeometry, material );
	line.position.set(0.25,0,0)
	scene.add( line );
	//axis
	// var axisHelper = new THREE.AxisHelper( 2 );
	// scene.add( axisHelper );
}

function drawflume(){
	var flumeMaterial = new THREE.MeshBasicMaterial( {color:0xD3D3D3,side: THREE.DoubleSide } );
	var slopeL = 1.2;
	var slopeW = 0.06;
	var angle = 20;
	var slope = new THREE.Mesh( new THREE.PlaneGeometry( slopeL,slopeW), flumeMaterial );
	slope.rotation.y = angle* Math.PI /180;
	slope.position.set( -slopeL* Math.cos(angle* Math.PI /180)/2, 0 , slopeL * Math.sin(angle* Math.PI /180)/2 + 0.001);
	scene.add( slope );
	// container
	var container = new THREE.Mesh( new THREE.PlaneGeometry( 0.5,0.5), flumeMaterial );
	container.position.set(0.25,0,-0.005);
	scene.add( container );
	//slope sidewall
}

$.ajax({
	 url: 'https://dl.dropboxusercontent.com/s/47t1zbfskt9eqcn/DEMdata.json?dl=0',//remote
	// url: 'data2.json',//local
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
	t = 0;
	// var n = alldata.timedata[t].x.length;
	// for ( var i = 0; i < n; i ++ ) {
	// 	var vertex = new THREE.Vector3();
	// 	vertex.x = alldata.timedata[t].x[i];
	// 	vertex.y = alldata.timedata[t].y[i];
	// 	vertex.z = alldata.timedata[t].z[i];
	// 	(alldata.timedata[t].r[i] >= 0.003)? Lgeometry.vertices.push( vertex ): Sgeometry.vertices.push( vertex );
	// }
	Sgeometry = construtGeo(alldata.data.small,0);
	Lgeometry = construtGeo(alldata.data.large,0);

	var Smaterial = new THREE.PointsMaterial( { size: 0.5, map: mapC, vertexColors: THREE.VertexColors,
		alphaTest: 0.5, depthTest: true, transparent : true} );
	var Lmaterial = new THREE.PointsMaterial( { size: 1, map: mapC, vertexColors: THREE.VertexColors, 
		alphaTest: 0.5, depthTest: true, transparent : true} );

	Lparticles = new THREE.Points(Lgeometry,Lmaterial);
	Lparticles.frustumCulled = false;
	Sparticles = new THREE.Points(Sgeometry,Smaterial);
	Sparticles.frustumCulled = false;

	group.add(Lparticles);
	group.add(Sparticles);
	scene.add(group);

	var legend = lut.setLegendOn({'layout':'horizontal','position': { 'x': 0.25, 'y': 0.5, 'z': 0.002 },'dimensions':{'width': 0.08, 'height': 0.4} } );
	legendGroup.add(legend);					
	var labels = lut.setLegendLabels( { 'title': 'velocity', 'um': 'm/s', 'ticks': 5 , 'fontsize': 16,'decimal':1} );
	legendGroup.add ( labels['title'] );
	for ( var i = 0; i < Object.keys( labels[ 'ticks' ] ).length; i++ ) {
		legendGroup.add ( labels[ 'lines' ][ i ] );
		legendGroup.add ( labels[ 'ticks' ][ i ] );
	}
	legendGroup.visible = false;

	scene.add(legendGroup);
}

function updateScene(t){

	if (effectController.colormap == false){
		legendGroup.visible = false;
		var colorValue = new THREE.Color(0x0072BD);
		updateGeo(Sgeometry,alldata.data.small,t,colorValue);
		var colorValue = new THREE.Color( 0xBF4916);
		updateGeo(Lgeometry,alldata.data.large,t,colorValue);

	} else{
		legendGroup.visible = true;
		updateGeo(Sgeometry,alldata.data.small,t,lut);
		updateGeo(Lgeometry,alldata.data.large,t,lut);
	}
	
	Sgeometry.verticesNeedUpdate = true;
	Lgeometry.verticesNeedUpdate = true;

	scene.remove(timer);
	timer = spriteTimer(t);
	scene.add(timer);
}

function updateT(t) {
	if (t < 49) {
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
	spriteTitle.position.set( 0.5, -0.5, 0.0);
	return spriteTitle;
}

function construtGeo(xyzvData,t){
	var geometry = new THREE.BufferGeometry();	
	var n = xyzvData.x[0].length;
	var k=0;
	var vertices = new Float32Array(3*n);
	var color = new Float32Array(3*n);
	var velocity = new Float32Array(3*n);
	var indices = new Uint32Array(n);

	// for (var i = 0; i < n; i++) {
	//    indices[i] = i;
	// }

	var colorValue = new THREE.Color(0xffffff );
		colorValue.setHSL(0.1,0.1,0.3)
	for ( var i = 0; i < n; i ++ ) {
		var v = xyzvData.v[t][i];
		vertices[k]=xyzvData.x[t][i];
			color[k]= colorValue.r;
				velocity[k] = v;
		k++;
		vertices[k]=xyzvData.y[t][i];
			color[k]= colorValue.g;
				velocity[k] = v;
		k++;
		vertices[k]=xyzvData.z[t][i];
			color[k]= colorValue.b;
				velocity[k] = v;
		k++;
	} 
	geometry.addAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
	geometry.addAttribute( 'height', new THREE.BufferAttribute( vertices, 3 ) );
	// geometry.setIndex( new THREE.BufferAttribute( indices, 1 ) );
	geometry.addAttribute( 'color', new THREE.BufferAttribute( color, 3 ) );
	geometry.computeVertexNormals();
	geometry.normalizeNormals();
	return geometry;
}

function updateGeo(geo,xyzvData,t,color){
	var n = xyzvData.x[0].length;
	for ( var i = 0; i < n; i++) {
		var v = xyzvData.v[t][i];
		var colorValue;
		if (color.isColor) {
			colorValue = color
		}  else{
			colorValue = lut.getColor(v);
		} 
		geo.attributes.position.array[i*3]=xyzvData.x[t][i];
		geo.attributes.position.array[i*3+1]=xyzvData.y[t][i];
		geo.attributes.position.array[i*3+2]=xyzvData.z[t][i];

		geo.attributes.color.array[i*3]=colorValue.r;
		geo.attributes.color.array[i*3+1]=colorValue.g;
		geo.attributes.color.array[i*3+2]=colorValue.b;
	} 

	geo.attributes.position.needsUpdate = true;
	geo.attributes.color.needsUpdate = true;
	geo.computeVertexNormals();
	geo.normalizeNormals();
}


