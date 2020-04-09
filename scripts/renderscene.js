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
            type: 'parallel',
            prp: Vector3(0, 0, 100),
            srp: Vector3(0, 0, 0),
            vup: Vector3(0, 1, 0),
            clip: [-1, 17, -0.5, 13, 99, 150]
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
    
    //Clear scene
    ctx.clearRect(0, 0, view.width, view.height);
    
    var time = timestamp - start_time;

    // -----Step 2: Transform Models-----
    
    var zmin = -scene.view.clip[4]/scene.view.clip[5];
    for (let i = 0; i < scene.models.length; i++)
    {
        for (let j = 0; j < scene.models[i].edges.length; j++)
        {
            for (let k = 0; k < scene.models[i].edges[j].length - 1; k++)
            {
                vertex0 = scene.models[i].vertices[scene.models[i].edges[j][k]];
                vertex1 = scene.models[i].vertices[scene.models[i].edges[j][k+1]];
                
                if (scene.view.type == "parallel")
                {
                    //Calculate transformation matrix to transform models into canonical view volume
                    Mat4x4Parallel(scene.models[i].matrix, scene.view.prp, scene.view.srp, scene.view.vup, scene.view.clip);
                }
                else if (scene.view.type == "perspective")
                {
                    //Calculate transformation matrix to transform models into canonical view volume
                    Mat4x4Projection(scene.models[i].matrix, scene.view.prp, scene.view.srp, scene.view.vup, scene.view.clip);
                }
                
                //Multiply vertices with transformation matrix
                var vertex = Matrix.multiply([scene.models[i].matrix, vertex0]);
                vertex0 = Vector4(vertex.x, vertex.y, vertex.z, vertex.w);
                var vertex = Matrix.multiply([scene.models[i].matrix, vertex1]);
                vertex1 = Vector4(vertex.x, vertex.y, vertex.z, vertex.w);
                
                //3D Line Clipping
                var result = clipLine(vertex0, vertex1, scene.view.type, zmin);
                //result = {pt0: vertex0, pt1: vertex1};
                if (result != null)
                {
                    //Draw Line
                    DrawScene(result);
                }
            }
        }
    }

    window.requestAnimationFrame(Animate);
}

// Main drawing code - use information contained i0n variable `scene`
function DrawScene(result) {
    console.log(scene);
    
    //Multiply vertices by Mpar or Mper matrix
    var Mpar = new Matrix(4,4);
    Mat4x4MPar(Mpar);
    var Mper = new Matrix(4,4);
    Mat4x4MPer(Mper);
    if (scene.view.type == "parallel")
    {
        var vertex0 = Matrix.multiply([Mpar, result.pt0]);
        result.pt0 = Vector4(vertex0.x, vertex0.y, vertex0.z, vertex0.w);
        var vertex1 = Matrix.multiply([Mpar, result.pt1]);
        result.pt1 = Vector4(vertex1.x, vertex1.y, vertex1.z, vertex1.w);
    }
    else if (scene.view.type == "perspective")
    {
        var vertex0 = Matrix.multiply([Mper, result.pt0]);
        result.pt0 = Vector4(vertex0.x, vertex0.y, vertex0.z, vertex0.w);
        var vertex1 = Matrix.multiply([Mper, result.pt1]);
        result.pt1 = Vector4(vertex1.x, vertex1.y, vertex1.z, vertex1.w);
    }

     //Project onto view plane
    var projectionMatrix = new Matrix(4,4);
    projectionMatrix.values = [[400, 0, 0, 400],
                               [0, 300, 0, 300],
                               [0, 0, 1, 0],
                               [0, 0, 0, 1]];
    
    var vertex0 = Matrix.multiply([projectionMatrix, result.pt0]);
    result.pt0 = Vector4(vertex0.x, vertex0.y, vertex0.z, vertex0.w);
    var vertex1 = Matrix.multiply([projectionMatrix, result.pt1]);
    result.pt1 = Vector4(vertex1.x, vertex1.y, vertex1.z, vertex1.w);
    
    //Draw 2D lines for each edge
    console.log(result);
    DrawLine(result.pt0.x/result.pt0.w, result.pt0.y/result.pt0.w, result.pt1.x/result.pt1.w, result.pt1.y/result.pt1.w);
    
}

function outcode(vector, type, zmin)
{
    var outcode = 0;
    var z = vector.z;
    if (type == "parallel")
    {
        if (vector.x < -1)      { outcode += LEFT; }
        else if (vector.x > 1)  { outcode += RIGHT; }
        if (vector.y < -1)      { outcode += BOTTOM; }
        else if (vector.y > 1)  { outcode += TOP; }
        if (vector.z < 0)       { outcode += FRONT; }
        else if (vector.z > -1) { outcode += BACK; }
    }
    else if (type == "perspective")
    {
        if (vector.x < z)       { outcode += LEFT; }
        else if (vector.x > -z) { outcode += RIGHT; }
        if (vector.y < z)       { outcode += BOTTOM; }
        else if (vector.y > -z) { outcode += TOP; }
        if (vector.z < zmin)    { outcode += FRONT; }
        else if (vector.z > -1) { outcode += BACK; }
    }
    return outcode;
}

function clipLine(vertex0, vertex1, type, zmin)
{
    var out0 = outcode(vertex0, type, zmin);
    var out1 = outcode(vertex1, type, zmin);
    var t;
    var result;
    var selectpt;
    var selectout;
    var done = false;
    
    while (!done)
    {
        console.log(vertex0);
        console.log(vertex1);
        if ((out0 | out1) === 0)
        {
            //Trivial Accept
            result = {pt0: vertex0, pt1: vertex1};
            done = true;
        }
        else if ((out0 & out1) !== 0)
        {
            //Trivial Reject
            result = null;
            done = true;
        }
        else
        {
            //Select a vertex that's not 0
            if (out0 !== 0)
            {
                selectpt = vertex0;
                selectout = out0;
            }
            else
            {
                selectpt = vertex1;
                selectout = out1;
            }
            
            if ((selectout & LEFT) !== 0)
            {
                //Clip to left edge
                if (type == "parallel")
                {
                    t = (-1 - vertex0.x)/(vertex1.x - vertex0.x);
                    selectpt.y = vertex0.y + t * (vertex1.y - vertex0.y);
                    selectpt.z = vertex0.z + t * (vertex1.z - vertex0.z);
                    selectpt.x = -1
                }
                else if (type == "perspective")
                {
                    t = (-vertex0.x + vertex0.z)/((vertex1.x - vertex0.x) - (vertex1.z - vertex0.z));
                    selectpt.x = vertex0.x + t * (vertex1.x - vertex0.x);
                    selectpt.y = vertex0.y + t * (vertex1.y - vertex0.y);
                    selectpt.z = vertex0.z + t * (vertex1.z - vertex0.z);
                }
                
            }
            else if ((selectout & RIGHT) !== 0)
            {
                //Clip to right edge
                if (type == "parallel")
                {
                    t = (1 - vertex0.x)/(vertex1.x - vertex0.x);
                    selectpt.y = vertex0.y + t * (vertex1.y - vertex0.y);
                    selectpt.z = vertex0.z + t * (vertex1.z - vertex0.z);
                    selectpt.x = 1
                }
                else if (type == "perspective")
                {
                    t = (vertex0.x + vertex0.z)/(-(vertex1.x - vertex0.x) - (vertex1.z - vertex0.z));
                    selectpt.x = vertex0.x + t * (vertex1.x - vertex0.x);
                    selectpt.y = vertex0.y + t * (vertex1.y - vertex0.y);
                    selectpt.z = vertex0.z + t * (vertex1.z - vertex0.z);
                }
            }
            else if ((selectout & BOTTOM) !== 0)
            {
                //Clip to bottom edge
                if (type == "parallel")
                {
                    t = (-1 - vertex0.y)/(vertex1.y - vertex0.y);
                    selectpt.x = vertex0.x + t * (vertex1.x - vertex0.x);
                    selectpt.z = vertex0.z + t * (vertex1.z - vertex0.z);
                    selectpt.y = -1
                }
                else if (type == "perspective")
                {
                    t = (-vertex0.y + vertex0.z)/((vertex1.y - vertex0.y) - (vertex1.z - vertex0.z));
                    selectpt.x = vertex0.x + t * (vertex1.x - vertex0.x);
                    selectpt.y = vertex0.y + t * (vertex1.y - vertex0.y);
                    selectpt.z = vertex0.z + t * (vertex1.z - vertex0.z);
                }
            }
            else if ((selectout & TOP) !== 0)
            {
                //Clip to top edge
                if (type == "parallel")
                {
                    t = (1 - vertex0.y)/(vertex1.y - vertex0.y);
                    selectpt.x = vertex0.x + t * (vertex1.x - vertex0.x);
                    selectpt.z = vertex0.z + t * (vertex1.z - vertex0.z);
                    selectpt.y = 1
                }
                else if (type == "perspective")
                {
                    t = (vertex0.y + vertex0.z)/(-(vertex1.y - vertex0.y) - (vertex1.z - vertex0.z));
                    selectpt.x = vertex0.x + t * (vertex1.x - vertex0.x);
                    selectpt.y = vertex0.y + t * (vertex1.y - vertex0.y);
                    selectpt.z = vertex0.z + t * (vertex1.z - vertex0.z);
                }
            }
            else if ((selectout & FRONT) !== 0)
            {
                //Clip to front edge
                if (type == "parallel")
                {
                    t = (0 - vertex0.z)/(vertex1.z - vertex0.z);
                    selectpt.x = vertex0.x + t * (vertex1.x - vertex0.x);
                    selectpt.y = vertex0.y + t * (vertex1.y - vertex0.y);
                    selectpt.z = 0
                }
                else if (type == "perspective")
                {
                    t = (vertex0.z - zmin)/(-(vertex1.z - vertex0.z));
                    selectpt.x = vertex0.x + t * (vertex1.x - vertex0.x);
                    selectpt.y = vertex0.y + t * (vertex1.y - vertex0.y);
                    selectpt.z = vertex0.z + t * (vertex1.z - vertex0.z);
                }
            }
            else
            {
                //Clip to back edge
                if (type == "parallel")
                {
                    t = (-1 - vertex0.z)/(vertex1.z - vertex0.z);
                    selectpt.x = vertex0.x + t * (vertex1.x - vertex0.x);
                    selectpt.y = vertex0.y + t * (vertex1.y - vertex0.y);
                    selectpt.z = -1
                }
                else if (type == "perspective")
                {
                    t = (-vertex0.z - 1)/(vertex1.z - vertex0.z);
                    selectpt.x = vertex0.x + t * (vertex1.x - vertex0.x);
                    selectpt.y = vertex0.y + t * (vertex1.y - vertex0.y);
                    selectpt.z = vertex0.z + t * (vertex1.z - vertex0.z);
                }
            }
            
            //Recalculate outcode
            if (selectout === out0)
            {
                out0 = outcode(selectpt, type, zmin);
                vertex0.values = selectpt.values;
            }
            else
            {
                out1 = outcode(selectpt, type, zmin);
                vertex1.values = selectpt.values;
            }
        }
    }
    return result;
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
    var n = scene.view.prp.subtract( scene.view.srp );
    n.normalize(); 
    var u = scene.view.vup.cross( n );
    u.normalize();

    switch (event.keyCode) {
        case 37: // LEFT Arrow
            console.log("left");
            scene.view.prp.subtract(u); 
            scene.view.srp.subtract(u); 
            //DrawScene(); 
            
            break;
        case 38: // UP Arrow
            console.log("up");
            scene.view.prp.add(n); 
            scene.view.srp.add(n); 
            //DrawScene(); 
            break;
        case 39: // RIGHT Arrow
            console.log("right");
            scene.view.prp.add(u); 
            scene.view.srp.add(u); 
            //DrawScene(); 
            break;
        case 40: // DOWN Arrow
            console.log("down");
            scene.view.prp.subtract(n); 
            scene.view.srp.subtract(n); 
            //DrawScene(); 
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
