var view;
var ctx;
var scene;
var start_time;
var LEFT =   32; //100000
var RIGHT =  16; //010000
var BOTTOM = 8;  //001000
var TOP =    4;  //000100
var FRONT =  2;  //000010
var BACK =   1;  //000001

// Initialization function - called when web page loads
function Init() {
    var w = 800;
    var h = 600;
    view = document.getElementById('view');
    view.width = w;
    view.height = h;

    ctx = view.getContext('2d');

    // initial scene... feel free to change this
    scene = {
        view: {
            type: 'perspective',
            prp: Vector3(44, 20, -16),
            srp: Vector3(20, 20, -40),
            vup: Vector3(0, 1, 0),
            clip: [-19, 5, -10, 8, 12, 100]
        },
        models: [
            {
                type: 'generic',
                vertices: [
                    Vector4( 0,  0, -30, 1),
                    Vector4(20,  0, -30, 1),
                    Vector4(20, 12, -30, 1),
                    Vector4(10, 20, -30, 1),
                    Vector4( 0, 12, -30, 1),
                    Vector4( 0,  0, -60, 1),
                    Vector4(20,  0, -60, 1),
                    Vector4(20, 12, -60, 1),
                    Vector4(10, 20, -60, 1),
                    Vector4( 0, 12, -60, 1)
                ],
                edges: [
                    [0, 1, 2, 3, 4, 0],
                    [5, 6, 7, 8, 9, 5],
                    [0, 5],
                    [1, 6],
                    [2, 7],
                    [3, 8],
                    [4, 9]
                ],
                matrix: new Matrix(4, 4)
            }
        ]
    };

    // event handler for pressing arrow keys
    document.addEventListener('keydown', OnKeyDown, false);
    
    // start animation loop
    start_time = performance.now(); // current timestamp in milliseconds
    window.requestAnimationFrame(Animate);
}

// Animation loop - repeatedly calls rendering code
function Animate(timestamp) {
    // step 1: calculate time (time since start) 
    // step 2: transform models based on time
    // step 3: draw scene
    // step 4: request next animation frame (recursively calling same function)


    var time = timestamp - start_time;

    // -----Step 2: Transform Models-----
    
    //Calculate transformation matrix to transform models into canonical view volume
    if (scene.view.type == "parallel")
    {
        for (let i = 0; i < scene.models.length; i++)
        {
            Mat4x4Parallel(scene.models[i].matrix, scene.view.prp, scene.view.srp, scene.view.vup, scene.view.clip);
        }
    }
    else if (scene.view.type == "perspective")
    {
        for (let i = 0; i < scene.models.length; i++)
        {
            Mat4x4Projection(scene.models[i].matrix, scene.view.prp, scene.view.srp, scene.view.vup, scene.view.clip);    
        }
    }
    //Multiply vertices with transformation matrix
    for (let i = 0; i < scene.models.length; i++)
    {
        for (let j = 0; j < scene.models[i].vertices.length; j++)
        {
            var vertex = Matrix.multiply([scene.models[i].matrix, scene.models[i].vertices[j]]);
            console.log(scene.models[i].matrix);
            scene.models[i].vertices[j] = Vector4(vertex.x, vertex.y, vertex.z, vertex.w);
        }
    }
    
    //Implement Cohen-Sutherland 3D line clipping
    if (scene.view.type == "parallel")
    {
        //var boundingPlane = [-1, 1, -1, 1, 0, -1];
        for (let i = 0; i < scene.models.length; i++)
        {
            for (let j = 0; j < scene.models[i].vertices.length; j++)
            {
                clipLine(scene.models[i].vertices[j]);
            }
        }
        
    }
    else if (scene.view.type == "perspective")
    {
        //var boundingPlane = [z, -z, z, -z, zmin, -1];
        for (let i = 0; i < scene.models.length; i++)
        {
            for (let j = 0; j < scene.models[i].vertices.length; j++)
            {
                clipLine(scene.models[i].vertices[j]);
            }
        }
    }
    
    //Project onto view plane
    var projectionMatrix = new Matrix(4,4);
    projectionMatrix.values = [[400, 0, 0, 400],
                               [0, 300, 0, 300],
                               [0, 0, 1, 0],
                               [0, 0, 0, 1]];
    
    for (let i = 0; i < scene.models.length; i++)
    {
        for (let j = 0; j < scene.models[i].vertices.length; j++)
        {
            var vertex = Matrix.multiply([projectionMatrix, scene.models[i].vertices[j]]);
            scene.models[i].vertices[j] = Vector4(vertex.x, vertex.y, vertex.z, vertex.w);
            //console.log(scene.models[i].vertices[j]);
        }
    }
    
    DrawScene();

    window.requestAnimationFrame(Animate);
}

// Main drawing code - use information contained i0n variable `scene`
function DrawScene() {
    console.log(scene);
    //Clear scene
    view = document.getElementById('view');
    ctx.clearRect(0, 0, view.width, view.height);
    
    //Draw 2D lines for each edge
    for (let i = 0; i < scene.models.length; i++)
    {
        for (let j = 0; j < scene.models[i].edges.length; j++)
        {
            var pt1 = scene.models[i].edges[j][0];
            var pt2 = scene.models[i].edges[j][1];
            //console.log(scene.models[i].vertices[pt1].x);
            //console.log(scene.models[i].vertices[pt1].y);
            //console.log(scene.models[i].vertices[pt2].x);
            //console.log(scene.models[i].vertices[pt2].y)
            DrawLine(scene.models[i].vertices[pt1].x, scene.models[i].vertices[pt1].y, scene.models[i].vertices[pt2].x, scene.models[i].vertices[pt2].y);
        }
    }
    
}

function outcode(vector)
{
    var outcode = 0;
    if (vector.x < view.x_min) { outcode += LEFT; }
    else if (vector.x > view.x_max) { outcode += RIGHT; }
    if (vector.y < view.y_min) { outcode += BOTTOM; }
    else if (vector.y > view.y_max) { outcode += TOP; }
    if (vector.z < view.z_min) { outcode += FRONT; }
    else if (vector.z > view.z_max) { outcode += BACK; }
    
    return outcode;
}

function clipLine(vector)
{
    
}

// Called when user selects a new scene JSON file
function LoadNewScene() {
    var scene_file = document.getElementById('scene_file');

    console.log(scene_file.files[0]);

    var reader = new FileReader();
    reader.onload = (event) => {
        scene = JSON.parse(event.target.result);
        scene.view.prp = Vector3(scene.view.prp[0], scene.view.prp[1], scene.view.prp[2]);
        scene.view.srp = Vector3(scene.view.srp[0], scene.view.srp[1], scene.view.srp[2]);
        scene.view.vup = Vector3(scene.view.vup[0], scene.view.vup[1], scene.view.vup[2]);

        for (let i = 0; i < scene.models.length; i++) {
            if (scene.models[i].type === 'generic') {
                for (let j = 0; j < scene.models[i].vertices.length; j++) {
                    scene.models[i].vertices[j] = Vector4(scene.models[i].vertices[j][0],
                                                          scene.models[i].vertices[j][1],
                                                          scene.models[i].vertices[j][2],
                                                          1);
                }
            }
            else {
                scene.models[i].center = Vector4(scene.models[i].center[0],
                                                 scene.models[i].center[1],
                                                 scene.models[i].center[2],
                                                 1);
            }
            scene.models[i].matrix = new Matrix(4, 4);
        }
    };
    reader.readAsText(scene_file.files[0], "UTF-8");
}

// Called when user presses a key on the keyboard down 
function OnKeyDown(event) {

    //calculate u,v,n. 
    var n = scene.view.prp.subtract( scene.view.srp ).normalize(); 
    var u = scene.view.vup.cross( n ).normalize();

    switch (event.keyCode) {
        case 37: // LEFT Arrow
            console.log("left");
            scene.view.prp.subtract(u); 
            scene.view.srp.subtract(u); 
            DrawScene(); 
            
            break;
        case 38: // UP Arrow
            console.log("up");
            scene.view.prp.add(n); 
            scene.view.srp.add(n); 
            DrawScene(); 
            break;
        case 39: // RIGHT Arrow
            console.log("right");
            scene.view.prp.add(u); 
            scene.view.srp.add(u); 
            DrawScene(); 
            break;
        case 40: // DOWN Arrow
            console.log("down");
            scene.view.subtract(n); 
            scene.view.subtract(n); 
            DrawScene(); 
            break;
    }
}

// Draw black 2D line with red endpoints 
function DrawLine(x1, y1, x2, y2) {
    ctx.strokeStyle = '#000000';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.fillStyle = '#FF0000';
    ctx.fillRect(x1 - 2, y1 - 2, 4, 4);
    ctx.fillRect(x2 - 2, y2 - 2, 4, 4);
}
