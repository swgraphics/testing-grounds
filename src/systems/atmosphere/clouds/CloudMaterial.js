import * as THREE from "three";

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

const fragmentShader = /* glsl */`

uniform float time;

uniform float coverage;
uniform float density;
uniform float softness;
uniform float fluffiness;
uniform float wispy;

uniform vec3 upperColor;
uniform vec3 lowerColor;
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

   vec3 samplePosition =

    vec3(

        vWorldPosition.x,

        vWorldPosition.y * 0.22,

        vWorldPosition.z

    ) * 0.006 +

    vec3(

        time * 0.01,

        0.0,

        0.0

    );

vec3 warp =

    domainWarp(

        samplePosition * 0.55

    );

float vapor =

    fbm(

        samplePosition +

        warp * 3.5

    );
float heightMask =

    smoothstep(
        0.05,
        0.18,
        horizon
    );

vapor *= heightMask;

// Stretch the usable range
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

// Build up thicker cloud bodies
alpha = pow(alpha, 0.65);

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

            time:{value:0},

            coverage:{value:0.55},
            density:{value:0.70},
            softness:{value:0.60},
            fluffiness:{value:0.80},
            wispy:{value:0.35},

            upperColor:{
                value:new THREE.Color("#ffffff")
            },

            lowerColor:{
                value:new THREE.Color("#707785")
            }

        }

    });

}