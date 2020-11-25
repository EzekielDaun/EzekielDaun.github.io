window.onload = (function () {
    var div = document.getElementById("ball");

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera( 75, div.clientWidth / div.clientHeight, 0.1, 1000 );

    var renderer = new THREE.WebGLRenderer();
    renderer.setSize( div.clientWidth, div.clientHeight );
    div.appendChild( renderer.domElement );

    var geometry = new THREE.BoxGeometry();
    var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
    var cube = new THREE.Mesh( geometry, material );
    scene.add( cube );

    camera.position.z = 2;

    var animate = function () {
        requestAnimationFrame( animate );

        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;

        renderer.render( scene, camera );
    };

    animate();

});