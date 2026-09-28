// 기존 링의 색과 위치를 도착점으로 공유해 꽃잎, 먼지, 금속 표면이 이어집니다.
const noise = `
float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p) {
  vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
float surface(vec2 uv) { return (.65*uv.x+.35*(1.0-uv.y))*.4+noise(uv*32.0)*.45+noise(uv*110.0)*.15; }
float threshold(float t) { return smoothstep(2.85,4.25,t)*1.15-.07; }
float material(float t,vec2 uv) { return smoothstep(surface(uv)-.07,surface(uv)+.07,threshold(t)); }
vec2 rotate(vec2 p,float a) { return vec2(cos(a)*p.x-sin(a)*p.y,sin(a)*p.x+cos(a)*p.y); }
`;
const vertexCommon = `
precision highp float;
uniform vec2 uViewport,uImage,uCenter;
uniform float uTime,uAngle,uDpr;
${noise}
vec4 project(vec2 p) { return vec4((uCenter+p)/uViewport*vec2(2,-2)+vec2(-1,1),0,1); }
`;
// 두 대각선의 바람이 링의 회전으로 합류한 뒤, 각 입자의 실제 표면 위치에 정착합니다.
const flight = `
vec2 bezier(vec2 a,vec2 b,vec2 c,vec2 d,float t) {
  float s=1.0-t; return s*s*s*a+3.0*s*s*t*b+3.0*s*t*t*c+t*t*t*d;
}
vec3 flight(vec2 target,vec3 seed,float t) {
  float side=step(.48,seed.z)*2.0-1.0;
  float delay=seed.x*.7;
  float arrive=smoothstep(delay,1.8+delay*.5,t);
  float settle=smoothstep(1.9+seed.y*.3,3.45+seed.x*.35,t);
  float loose=1.0-settle;
  vec2 orbit=rotate(target*(1.0+loose*.35),loose*(3.6+seed.y*.3));
  orbit+=vec2(sin(seed.x*19.0+t*2.7),cos(seed.y*21.0-t*2.2))*loose*uImage.x*.035;
  vec2 source=vec2(side*uViewport.x*(.7+seed.y*.35),-side*uViewport.y*(.35+seed.x*.45));
  vec2 bendA=vec2(-side*uViewport.x*.18,-side*uViewport.y*.55);
  vec2 bendB=vec2(-side*uImage.x*.6,side*uImage.y*.45);
  vec2 p=bezier(source,bendA,bendB,orbit,arrive);
  float depth=sin(t*1.7+seed.z*6.28)*(1.0-settle)*190.0;
  float perspective=800.0/(800.0+depth);
  return vec3(rotate(p*perspective,uAngle),perspective);
}
`;
const particleVertex = `${vertexCommon}${flight}
attribute vec2 aTarget;
attribute vec4 aColor;
attribute vec3 aSeed;
varying vec4 vColor;
void main() {
  vec3 p=flight(aTarget*uImage,aSeed,uTime);
  gl_Position=project(p.xy);
  float glint=step(.992,aSeed.z);
  gl_PointSize=uDpr*(1.2+aSeed.y*1.3+glint*4.0)*p.z;
  float alpha=smoothstep(.1,.4,uTime)*(1.0-material(uTime,aTarget+.5))*(1.0-smoothstep(3.8,4.35,uTime));
  vec3 tint=mix(aColor.rgb,vec3(1.0,.5,.78),.5);
  vColor=vec4(tint,alpha*aColor.a*.7);
}
`;
const particleFragment = `
precision mediump float;
varying vec4 vColor;
void main() {
  float r=length(gl_PointCoord-.5)*2.0;
  float core=1.0-smoothstep(.08,.72,r);
  float glow=(1.0-smoothstep(.2,1.0,r))*.18;
  gl_FragColor=vec4(vColor.rgb,vColor.a*(core+glow));
}
`;
const petalVertex = `${vertexCommon}${flight}
attribute vec2 aCorner,aTarget;
attribute vec3 aSeed;
varying vec2 vUv;
varying vec3 vTint;
varying float vAlpha,vLight;
void main() {
  float settle=smoothstep(2.0,3.85,uTime);
  float foreground=step(.91,aSeed.y);
  vec3 p=flight(aTarget*uImage,aSeed,uTime);
  // 소수의 전경 꽃잎은 링을 지나 화면 밖으로 빠져나가 원근감을 만듭니다.
  float exit=smoothstep(2.1+aSeed.x*.5,4.65,uTime)*foreground;
  p.xy+=vec2((aSeed.z-.45)*uViewport.x*2.0,uViewport.y*.95)*exit;
  float size=(9.0+aSeed.y*23.0+foreground*25.0)*min(1.0,uViewport.x/800.0);
  size*=p.z*mix(1.0,.06,settle*(1.0-foreground));
  float tumble=aSeed.z*6.28+uTime*(3.5+aSeed.x*3.0);
  vec2 local=aCorner;
  local.x*=.2+.8*abs(cos(tumble));
  local.y+=sin(local.x*2.8+tumble)*.16;
  local=rotate(local,aSeed.x*6.28+uTime*(aSeed.z-.5)*3.5);
  gl_Position=project(p.xy+local*size);
  vUv=aCorner;
  vLight=.58+.42*abs(sin(tumble+.8));
  vTint=mix(vec3(1.0,.1,.46),vec3(1.0,.73,.86),aSeed.z);
  float dissolve=material(uTime,aTarget+.5)*(1.0-foreground);
  vAlpha=smoothstep(.05,.3,uTime)*(1.0-dissolve)*(1.0-smoothstep(4.05,4.8,uTime))*.9;
}
`;
const petalFragment = `
precision mediump float;
varying vec2 vUv;
varying vec3 vTint;
varying float vAlpha,vLight;
void main() {
  vec2 p=vUv;
  // 갈라진 꽃잎 끝과 가는 밑동을 셰이더로 그려 추가 이미지 요청을 줄입니다.
  float y=(p.y+.9)/1.75;
  float width=.68*pow(max(0.0,sin(clamp(y,0.0,1.0)*3.14159)),.65)*(.55+.55*y);
  float edge=width-abs(p.x);
  float notch=smoothstep(.6,.88,p.y)*(1.0-smoothstep(.01,.19,abs(p.x)));
  float alpha=smoothstep(-.025,.035,edge)*(1.0-notch)*step(0.0,y)*step(y,1.0);
  float fold=pow(1.0-clamp(abs(p.x+.1*p.y)*2.2,0.0,1.0),5.0);
  vec3 color=vTint*vLight+vec3(.3,.22,.26)*fold;
  color*=.82+.18*y;
  gl_FragColor=vec4(color,alpha*vAlpha);
}
`;
const materialVertex = `${vertexCommon}
attribute vec2 aPosition;
varying vec2 vUv;
void main() { vUv=aPosition+.5; gl_Position=project(rotate(aPosition*uImage,uAngle)); }
`;
const materialFragment = `
precision highp float;
uniform sampler2D uTexture;
uniform float uTime;
varying vec2 vUv;
${noise}
void main() {
  vec4 color=texture2D(uTexture,vUv);
  if(color.a<.005) discard;
  float field=surface(vUv);
  float edge=(1.0-smoothstep(0.0,.065,abs(field-threshold(uTime))))*.42;
  gl_FragColor=vec4(color.rgb+vec3(1.0,.26,.55)*edge,color.a*material(uTime,vUv));
}
`;

export function createRingFormation(canvas, image, model, hero) {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, premultipliedAlpha: true });
  if (!gl) throw new Error('Ring formation needs WebGL');
  const shaders = [], programs = [], buffers = [], textures = [];
  let disposed = false;
  function dispose() {
    if (disposed) return;
    disposed = true;
    buffers.forEach(buffer => gl.deleteBuffer(buffer));
    textures.forEach(texture => gl.deleteTexture(texture));
    programs.forEach(program => gl.deleteProgram(program));
    shaders.forEach(shader => gl.deleteShader(shader));
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
  try {
    const mobile = window.matchMedia('(max-width: 700px)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const bounds = hero.getBoundingClientRect(), box = model.getBoundingClientRect();
    const width = hero.clientWidth, height = hero.clientHeight;
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.enable(gl.BLEND);
    gl.clearColor(0, 0, 0, 0);

    function program(vertex, fragment) {
      const program = gl.createProgram(); programs.push(program);
      for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]]) {
        const shader = gl.createShader(type); shaders.push(shader);
        gl.shaderSource(shader, source); gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
        gl.attachShader(program, shader);
      }
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
      return program;
    }
    function attribute(program, name, values, size) {
      const buffer = gl.createBuffer(); buffers.push(buffer);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(values), gl.STATIC_DRAW);
      return { buffer, size, location: gl.getAttribLocation(program, name) };
    }
    function pass(program, attributes) {
      gl.useProgram(program);
      gl.uniform2f(gl.getUniformLocation(program, 'uViewport'), width, height);
      gl.uniform2f(gl.getUniformLocation(program, 'uImage'), box.width, box.height);
      gl.uniform2f(gl.getUniformLocation(program, 'uCenter'), box.left-bounds.left+box.width/2, box.top-bounds.top+box.height/2+(mobile ? 7 : 9));
      gl.uniform1f(gl.getUniformLocation(program, 'uAngle'), (mobile ? -6 : -7)*Math.PI/180);
      gl.uniform1f(gl.getUniformLocation(program, 'uDpr'), dpr);
      return { program, attributes, time: gl.getUniformLocation(program, 'uTime') };
    }

    // 색상 샘플링은 초기화 때만 수행하고 매 프레임의 입자 계산은 GPU에서 처리합니다.
    const sample = document.createElement('canvas');
    sample.width = mobile ? 280 : 440; sample.height = Math.round(sample.width * image.naturalHeight / image.naturalWidth);
    const context = sample.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0, sample.width, sample.height);
    const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
    const positions = [], colors = [], seeds = [];
    let seed = 1928;
    const random = () => { seed = (1664525*seed+1013904223) >>> 0; return seed/4294967296; };
    for (let y = 0; y < sample.height; y += 2) for (let x = 0; x < sample.width; x += 2) {
      const index = (y*sample.width+x)*4;
      if (pixels[index+3] < 100) continue;
      positions.push((x+random()*1.8)/sample.width-.5, (y+random()*1.8)/sample.height-.5);
      colors.push(pixels[index]/255, pixels[index+1]/255, pixels[index+2]/255, pixels[index+3]/255);
      seeds.push(random(), random(), random());
    }
    const particleProgram = program(particleVertex, particleFragment);
    const particles = pass(particleProgram, [
      attribute(particleProgram, 'aTarget', positions, 2),
      attribute(particleProgram, 'aColor', colors, 4),
      attribute(particleProgram, 'aSeed', seeds, 3)
    ]);
    // 큰 꽃잎은 삼각형으로 그려 기기별 point-size 제한을 피합니다.
    const petalTargets = [], petalSeeds = [], corners = [];
    const petalCount = mobile ? 360 : 720;
    const quad = [-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1];
    for (let i = 0; i < petalCount; i++) {
      const target = Math.floor(random()*positions.length/2)*2;
      const petalSeed = [random(), random(), random()];
      for (let j = 0; j < 6; j++) {
        petalTargets.push(positions[target], positions[target+1]);
        petalSeeds.push(...petalSeed);
        corners.push(quad[j*2], quad[j*2+1]);
      }
    }
    const petalProgram = program(petalVertex, petalFragment);
    const petals = pass(petalProgram, [
      attribute(petalProgram, 'aTarget', petalTargets, 2),
      attribute(petalProgram, 'aSeed', petalSeeds, 3),
      attribute(petalProgram, 'aCorner', corners, 2)
    ]);
    const materialProgram = program(materialVertex, materialFragment);
    const material = pass(materialProgram, [attribute(materialProgram, 'aPosition', [-.5,-.5, .5,-.5, -.5,.5, -.5,.5, .5,-.5, .5,.5], 2)]);
    const texture = gl.createTexture(); textures.push(texture);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.uniform1i(gl.getUniformLocation(materialProgram, 'uTexture'), 0);
    function draw(pass, time, type, count) {
      gl.useProgram(pass.program); gl.uniform1f(pass.time, time);
      for (const { buffer, location, size } of pass.attributes) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
      }
      gl.drawArrays(type, 0, count);
      for (const { location } of pass.attributes) gl.disableVertexAttribArray(location);
    }
    return {
      render(time) {
        if (disposed) return;
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        draw(material, time, gl.TRIANGLES, 6);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        draw(particles, time, gl.POINTS, positions.length/2);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        draw(petals, time, gl.TRIANGLES, petalCount*6);
      },
      dispose
    };
  } catch (error) { dispose(); throw error; }
}
