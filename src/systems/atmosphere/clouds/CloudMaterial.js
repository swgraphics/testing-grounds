import * as THREE from "three";
//==================================================
// VERTEX SHADER
//==================================================
const vertexShader = /* glsl */`

varying vec3 vWorldPosition;
varying vec3 vNormal;

void main(){

    vNormal = normalize(normalMatrix * normal);

    vec4 worldPosition =
        modelMatrix *
        vec4(position,1.0);

    vWorldPosition =
        worldPosition.xyz;

    gl_Position =
        projectionMatrix *
        modelViewMatrix *
        vec4(position,1.0);

}

`;
//==================================================
// UNIFORMS
//==================================================
const fragmentShader = /* glsl */`

uniform float time;
uniform float speed;

uniform float coverage;
uniform float density;
uniform float softness;

uniform float brightness;
uniform float shadowStrength;

uniform float cloudScale;
uniform float cloudStretch;
uniform float puffiness;
uniform float wispy;
uniform float detail;

uniform vec3 upperColor;
uniform vec3 lowerColor;
uniform vec3 edgeColor;

float hash(vec3 p){

    p = fract(p * 0.3183099 + .1);
    p *= 17.0;

    return fract(
        p.x * p.y * p.z *
        (p.x + p.y + p.z)
    );

}

float noise(vec3 p){

    vec3 i = floor(p);
    vec3 f = fract(p);

    f =
        f*f*(3.0-2.0*f);

    return mix(
        mix(
            mix(hash(i+vec3(0,0,0)), hash(i+vec3(1,0,0)), f.x),
            mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x),
            f.y
        ),
        mix(
            mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x),
            mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x),
            f.y
        ),
        f.z
    );

}

//==================================================
// FRACTAL NOISE
//==================================================

float fbm(vec3 p){

    float value = 0.0;

    float amplitude = 0.5;

    for(int i=0;i<5;i++){

        value +=
            amplitude *
            noise(p);

        p *= 1.82;

        amplitude *= .5;

    }

    return value;

}
    vec3 domainWarp(vec3 p){

    return vec3(

        fbm(p + vec3(19.2,0.0,0.0)),

        fbm(p + vec3(0.0,37.8,0.0)),

        fbm(p + vec3(0.0,0.0,53.4))

    );

}
varying vec3 vWorldPosition;
varying vec3 vNormal;

void main(){

    vec3 normal =
        normalize(vNormal);

    float horizon =
    clamp(
        normal.y * 0.5 + 0.5,
        0.0,
        1.0
    );
    vec3 cloudColor =
    mix(
        lowerColor,
        upperColor,
        horizon
);

float rimMask =
    pow(
        1.0 - horizon,
        2.8
    );

rimMask *= 0.45;

cloudColor =
    mix(
        cloudColor,
        edgeColor,
        rimMask
    );
vec3 samplePosition =
    vWorldPosition;

// Compress vertically
samplePosition.y *= 0.22;

// Stretch horizontally
samplePosition.x *= cloudStretch;

//----------------------------------
// Overall Cloud Scale
//----------------------------------

// Larger slider = larger clouds

samplePosition *=
    0.006 / cloudScale;

// Animate
samplePosition += vec3(
    time * speed * 0.01,
    0.0,
    0.0
);
vec3 warp =
    domainWarp(
        samplePosition * 0.55
    );
//----------------------------------
// CLOUD SHAPE
//----------------------------------

float puffinessScale =
mix(
    1.35,
    0.70,
    puffiness
);

float cloudMass =
fbm(
    samplePosition *
    (0.28 * puffinessScale)
    +
    warp * wispy
);

float vapor =

    fbm(

        samplePosition *

        (1.45 * detail)

        +

        warp *

        (wispy * 2.0)

    );
float heightMask =

    smoothstep(
        -0.08,
        0.28,
        horizon
    );

cloudMass = smoothstep(
    0.15,
    0.55,
    cloudMass
);

vapor *= mix(
    0.45,
    1.0,
    cloudMass
);

vapor *= heightMask;

vapor = smoothstep(
    0.22,
    0.72,
    vapor
);

float alpha = smoothstep(
    coverage,
    coverage + softness,
    vapor
);

alpha *= density;

alpha = pow(alpha, 0.65);

// Fade out the bottom of the dome
float domeFade = smoothstep(
    0.08,
    0.28,
    horizon
);

alpha *= domeFade;
float lighting =

    mix(

        shadowStrength,

        1.0,

        cloudMass

    );

cloudColor *= lighting;

float rim =
    pow(
        1.0 - horizon,
        3.5
    );

cloudColor =
    mix(
        cloudColor,
        edgeColor,
        rim * 0.55
    );

cloudColor *= brightness;

gl_FragColor = vec4(
    cloudColor,
    alpha
);

}

`;

export function createCloudMaterial(){

    return new THREE.ShaderMaterial({

        transparent:true,

        depthWrite:false,

        side:THREE.BackSide,

        vertexShader,

        fragmentShader,

    uniforms:{

        time:{ value:0 },
        speed:{ value:2.5 },

        coverage:{ value:0.55 },
        density:{ value:0.70 },
        softness:{ value:0.60 },

        brightness:{ value:1.0 },
        shadowStrength:{ value:0.65 },

        cloudScale:{ value:4.0 },
        cloudStretch:{ value:1.0 },
        cloudRotation:{ value:0.0 },

        puffiness:{ value:0.50 },
        wispy:{ value:0.50 },
        detail:{ value:1.45 },

        upperColor:{
            value:new THREE.Color("#7a7474")
        },
        lowerColor:{
            value:new THREE.Color("#242425")
        },
        edgeColor:{
            value:new THREE.Color("#fdf7fd")
        },
    }

});

}