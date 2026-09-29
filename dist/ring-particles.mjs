// 기존 링의 색과 위치를 도착점으로 공유해 입자, 잔광, 금속 표면이 이어집니다.
const noise = `
float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p) {
  vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
vec2 ringSpace(vec2 uv) {
  vec2 p=uv-.5;
  return vec2(.913089*p.x-.407760*p.y,(.407760*p.x+.913089*p.y)*1.4);
}
float surface(vec2 uv) {
  vec2 p=ringSpace(uv);
  float arc=acos(clamp(-p.x/max(length(p),.001),-1.0,1.0));
  return 2.05+arc*.43+noise(uv*7.0)*.42+noise(uv*29.0)*.17;
}
float material(float t,vec2 uv) {
  float landed=surface(uv);
  return smoothstep(landed+.04,landed+.55,t);
}
vec2 rotate(vec2 p,float a) { return vec2(cos(a)*p.x-sin(a)*p.y,sin(a)*p.x+cos(a)*p.y); }
`;
const vertexCommon = `
precision highp float;
uniform vec2 uViewport,uImage,uCenter;
uniform float uTime,uAngle,uDpr;
${noise}
vec4 project(vec2 p) { return vec4((uCenter+p)/uViewport*vec2(2,-2)+vec2(-1,1),0,1); }
`;
// 한쪽에서 유입된 흐름이 곡면의 양쪽으로 갈라집니다. 접합부의 속도를 공유해 경로가 꺾이지 않습니다.
const flight = `
vec2 fromRing(vec2 p) { p.y/=1.4; return rotate(rotate(p,-.42)*uImage,uAngle); }
vec2 bezier(vec2 a,vec2 b,vec2 c,vec2 d,float t) {
  float s=1.0-t; return s*s*s*a+3.0*s*s*t*b+3.0*s*t*t*c+t*t*t*d;
}
vec3 flight(vec2 target,vec3 seed,float t) {
  vec2 uv=target/uImage+.5;
  vec2 polar=ringSpace(uv);
  float radius=length(polar);
  float arc=acos(clamp(-polar.x/max(radius,.001),-1.0,1.0));
  float side=polar.y<0.0 ? 1.0 : -1.0;
  float birth=.04+seed.z*.42;
  float entryTime=.8+seed.x*.36;
  float landing=surface(uv)-.12+seed.y*.28;
  float duration=landing-entryTime;
  float entryRadius=.48+seed.z*.035;
  vec2 entry=fromRing(vec2(-entryRadius,0.0));
  vec2 source=vec2(-uCenter.x-uViewport.x*(.08+seed.y*.16),uImage.y*(.12+(seed.x-.5)*.14));
  vec2 controlA=vec2(-uImage.x*.7,uImage.y*(.26+(seed.z-.5)*.12));
  // 진입 곡선과 곡면 경로의 접선을 맞춰 접합부에서도 속도를 연속으로 유지합니다.
  vec2 velocity=fromRing(vec2(-(radius-entryRadius),-side*entryRadius*arc))*3.0/duration;
  vec2 controlB=entry-velocity*(entryTime-birth)/3.0;
  float entering=clamp((t-birth)/(entryTime-birth),0.0,1.0);
  vec2 incoming=bezier(source,controlA,controlB,entry,entering);
  float phase=clamp((t-entryTime)/duration,0.0,1.0);
  float capture=1.0-pow(1.0-phase,3.0);
  float angle=3.14159265+side*arc*capture;
  float r=mix(entryRadius,radius,capture);
  vec2 orbit=fromRing(vec2(cos(angle),sin(angle))*r);
  vec2 p=t<entryTime ? incoming : orbit;
  float progress=clamp((t-birth)/(landing-birth),0.0,1.0);
  float free=pow(sin(progress*3.14159265),2.0);
  float wave=t*2.4+seed.x*6.283185;
  vec2 current=vec2(
    sin(wave+polar.y*11.0)+.4*sin(wave*1.7+seed.z*9.0),
    cos(wave*.87+polar.x*8.0)+.35*sin(wave*1.43+seed.y*11.0)
  );
  p+=current*uImage.y*(.013+seed.z*.022)*free;
  float depth=1.0+sin(progress*3.14159265)*(seed.z-.5)*.65;
  p*=1.0+(depth-1.0)*.16;
  return vec3(p,depth);
}
`;
const particleVertex = `${vertexCommon}${flight}
attribute vec2 aTarget;
attribute vec4 aColor;
attribute vec3 aSeed;
varying vec4 vColor;
varying float vSoft;
void main() {
  vec3 p=flight(aTarget*uImage,aSeed,uTime);
  gl_Position=project(p.xy);
  float glint=step(.992,aSeed.z);
  vSoft=step(.976,aSeed.z)*(1.0-glint);
  gl_PointSize=uDpr*(.9+aSeed.y*1.65+glint*3.8+vSoft*11.0)*p.z;
  float alpha=smoothstep(.1,.4,uTime)*(1.0-material(uTime,aTarget+.5))*(1.0-smoothstep(4.25,4.85,uTime));
  vec3 tint=mix(aColor.rgb,vec3(1.0,.12,.42),.3);
  vColor=vec4(tint,alpha*aColor.a*(.2+.16*aSeed.z)*mix(1.0,.12,vSoft));
}
`;
const particleFragment = `
precision mediump float;
varying vec4 vColor;
varying float vSoft;
void main() {
  float r=length(gl_PointCoord-.5)*2.0;
  float core=1.0-smoothstep(.08,.72,r);
  float glow=(1.0-smoothstep(.2,1.0,r))*.18;
  float shape=mix(core+glow,exp(-r*r*4.5)*(1.0-smoothstep(.6,1.0,r)),vSoft);
  gl_FragColor=vec4(vColor.rgb,vColor.a*shape);
}
`;
const glintVertex = `${vertexCommon}${flight}
attribute vec2 aCorner,aTarget;
attribute vec3 aSeed;
varying vec2 vUv;
varying vec4 vColor;
void main() {
  float settle=smoothstep(surface(aTarget+.5)-.55,surface(aTarget+.5)+.05,uTime);
  vec3 p=flight(aTarget*uImage,aSeed,uTime);
  vec2 velocity=flight(aTarget*uImage,aSeed,uTime+.025).xy-p.xy;
  // 바람을 따라 늘어나는 짧은 잔광만 남기고, 정착하면 작은 점으로 줄입니다.
  float speed=min(length(velocity),15.0);
  float lengthPx=mix(1.6+aSeed.y*2.5+speed*.75,1.2,settle);
  float widthPx=(.65+aSeed.z*.85)*p.z;
  float angle=atan(velocity.y,velocity.x+.0001)+sin(uTime*3.0+aSeed.x*15.0)*.12*(1.0-settle);
  float scale=min(1.0,uViewport.x/700.0);
  vec2 local=rotate(aCorner*vec2(lengthPx,widthPx)*scale,angle);
  gl_Position=project(p.xy+local);
  vUv=aCorner;
  vec3 tint=mix(vec3(1.0,.14,.5),vec3(1.0,.8,.94),aSeed.z);
  float formed=material(uTime,aTarget+.5);
  float alpha=smoothstep(.05,.35,uTime)*(1.0-formed)*(1.0-smoothstep(4.3,4.9,uTime));
  vColor=vec4(tint,alpha*(.18+.45*aSeed.y));
}
`;
const glintFragment = `
precision mediump float;
varying vec2 vUv;
varying vec4 vColor;
void main() {
  float radius=length(vUv);
  float core=1.0-smoothstep(.08,.65,radius);
  float halo=(1.0-smoothstep(.25,1.0,radius))*.22;
  gl_FragColor=vec4(vColor.rgb,vColor.a*(core+halo));
}
`;
const trailVertex = `${vertexCommon}${flight}
attribute vec2 aTarget,aTrail;
attribute vec3 aSeed;
varying vec2 vTrail;
varying vec4 vColor;
void main() {
  float age=aTrail.x;
  float time=max(0.0,uTime-age*(.18+aSeed.y*.42));
  vec3 p=flight(aTarget*uImage,aSeed,time);
  vec2 velocity=flight(aTarget*uImage,aSeed,time+.015).xy-p.xy;
  vec2 normal=vec2(-velocity.y,velocity.x)/max(length(velocity),.001);
  float leader=step(.97,aSeed.z);
  float width=(.35+aSeed.x*.75+leader*1.2)*sin(age*3.14159)*min(1.0,uViewport.x/700.0);
  gl_Position=project(p.xy+normal*aTrail.y*width);
  vTrail=aTrail;
  vec3 tint=mix(vec3(1.0,.08,.38),vec3(.72,.6,1.0),aSeed.z);
  float alpha=smoothstep(.05,.4,uTime)*(1.0-material(uTime,aTarget+.5))*(1.0-smoothstep(4.1,4.8,uTime));
  vColor=vec4(tint,alpha*(.18+aSeed.y*.32+leader*.75));
}
`;
const trailFragment = `
precision mediump float;
varying vec2 vTrail;
varying vec4 vColor;
void main() {
  float edge=1.0-smoothstep(.25,1.0,abs(vTrail.y));
  gl_FragColor=vec4(vColor.rgb,vColor.a*edge*pow(1.0-vTrail.x,1.4));
}
`;
const screenVertex = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() { vUv=aPosition*.5+.5; gl_Position=vec4(aPosition,0,1); }
`;
const blurFragment = `
precision mediump float;
uniform sampler2D uTexture;
uniform vec2 uStep;
varying vec2 vUv;
void main() {
  vec4 color=texture2D(uTexture,vUv)*.227027;
  color+=(texture2D(uTexture,vUv+uStep*1.384615)+texture2D(uTexture,vUv-uStep*1.384615))*.316216;
  color+=(texture2D(uTexture,vUv+uStep*3.230769)+texture2D(uTexture,vUv-uStep*3.230769))*.070270;
  gl_FragColor=color;
}
`;
const compositeFragment = `
precision mediump float;
uniform sampler2D uScene,uGlow;
varying vec2 vUv;
void main() {
  vec4 scene=texture2D(uScene,vUv);
  vec4 glow=texture2D(uGlow,vUv);
  gl_FragColor=vec4((scene.rgb+glow.rgb*2.1)/(vec3(1.0)+(scene.rgb+glow.rgb*2.1)*.65),clamp(scene.a+glow.a,0.0,1.0));
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
  float edge=(1.0-smoothstep(0.0,.17,abs(uTime-(field+.25))))*.65;
  gl_FragColor=vec4(color.rgb+vec3(1.0,.26,.55)*edge,color.a*material(uTime,vUv));
}
`;

export function createRingFormation(canvas, image, model, hero) {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, premultipliedAlpha: true });
  if (!gl) throw new Error('Ring formation needs WebGL');
  const shaders = [], programs = [], buffers = [], textures = [], framebuffers = [];
  let disposed = false;
  function dispose() {
    if (disposed) return;
    disposed = true;
    framebuffers.forEach(framebuffer => gl.deleteFramebuffer(framebuffer));
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
    sample.width = mobile ? 380 : 720; sample.height = Math.round(sample.width * image.naturalHeight / image.naturalWidth);
    const context = sample.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0, sample.width, sample.height);
    const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
    const positions = [], colors = [], seeds = [];
    let seed = 1928;
    const random = () => { seed = (1664525*seed+1013904223) >>> 0; return seed/4294967296; };
    for (let y = 0; y < sample.height; y += 2) for (let x = 0; x < sample.width; x += 2) {
      const index = (y*sample.width+x)*4;
      if (pixels[index+3] < 100) continue;
      for (let copy = 0; copy < (mobile ? 1 : 2); copy++) {
        positions.push((x+random()*1.8)/sample.width-.5, (y+random()*1.8)/sample.height-.5);
        colors.push(pixels[index]/255, pixels[index+1]/255, pixels[index+2]/255, pixels[index+3]/255);
        seeds.push(random(), random(), random());
      }
    }
    const particleProgram = program(particleVertex, particleFragment);
    const particles = pass(particleProgram, [
      attribute(particleProgram, 'aTarget', positions, 2),
      attribute(particleProgram, 'aColor', colors, 4),
      attribute(particleProgram, 'aSeed', seeds, 3)
    ]);
    // 속도에 따른 잔광은 삼각형으로 그려 기기별 point-size 제한을 피합니다.
    const glintTargets = [], glintSeeds = [], corners = [];
    const glintCount = mobile ? 600 : 1800;
    const quad = [-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1];
    for (let i = 0; i < glintCount; i++) {
      const target = Math.floor(random()*positions.length/2)*2;
      const glintSeed = [random(), random(), random()];
      for (let j = 0; j < 6; j++) {
        glintTargets.push(positions[target], positions[target+1]);
        glintSeeds.push(...glintSeed);
        corners.push(quad[j*2], quad[j*2+1]);
      }
    }
    const glintProgram = program(glintVertex, glintFragment);
    const glints = pass(glintProgram, [
      attribute(glintProgram, 'aTarget', glintTargets, 2),
      attribute(glintProgram, 'aSeed', glintSeeds, 3),
      attribute(glintProgram, 'aCorner', corners, 2)
    ]);
    const trailTargets = [], trailSeeds = [], trailCoordinates = [];
    const trailCount = mobile ? 70 : 210, segments = 28;
    for (let i = 0; i < trailCount; i++) {
      const target = Math.floor(random()*positions.length/2)*2;
      const seed = [random(), random(), random()];
      for (let j = 0; j < segments; j++) {
        for (const [age, side] of [[j,-1],[j,1],[j+1,-1],[j+1,-1],[j,1],[j+1,1]]) {
          trailTargets.push(positions[target],positions[target+1]);
          trailSeeds.push(...seed);
          trailCoordinates.push(age/segments,side);
        }
      }
    }
    const trailProgram = program(trailVertex, trailFragment);
    const trails = pass(trailProgram, [
      attribute(trailProgram, 'aTarget', trailTargets, 2),
      attribute(trailProgram, 'aSeed', trailSeeds, 3),
      attribute(trailProgram, 'aTrail', trailCoordinates, 2)
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
    // 잔광은 저해상도에서 두 번만 번지게 해 전체 해상도 다중 블러를 피합니다.
    function target(w, h) {
      const texture = gl.createTexture(); textures.push(texture);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      const framebuffer = gl.createFramebuffer(); framebuffers.push(framebuffer);
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('Particle framebuffer unavailable');
      return { texture, framebuffer, w, h };
    }
    const scene = target(canvas.width, canvas.height);
    const glowA = target(Math.max(1,Math.round(canvas.width/4)), Math.max(1,Math.round(canvas.height/4)));
    const glowB = target(glowA.w, glowA.h);
    const screen = [-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1];
    const blurProgram = program(screenVertex, blurFragment);
    const blur = { program: blurProgram, time: null, attributes: [attribute(blurProgram, 'aPosition', screen, 2)] };
    const compositeProgram = program(screenVertex, compositeFragment);
    const composite = { program: compositeProgram, time: null, attributes: [attribute(compositeProgram, 'aPosition', screen, 2)] };
    const blurStep = gl.getUniformLocation(blurProgram, 'uStep');
    gl.useProgram(blurProgram); gl.uniform1i(gl.getUniformLocation(blurProgram, 'uTexture'), 0);
    gl.useProgram(compositeProgram);
    gl.uniform1i(gl.getUniformLocation(compositeProgram, 'uScene'), 0);
    gl.uniform1i(gl.getUniformLocation(compositeProgram, 'uGlow'), 1);
    function blurInto(source, destination, x, y) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, destination.framebuffer);
      gl.viewport(0,0,destination.w,destination.h);
      gl.bindTexture(gl.TEXTURE_2D, source.texture);
      gl.useProgram(blurProgram); gl.uniform2f(blurStep,x,y);
      draw(blur,0,gl.TRIANGLES,6);
    }
    return {
      render(time) {
        if (disposed) return;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, scene.framebuffer);
        gl.viewport(0,0,scene.w,scene.h);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.BLEND);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        draw(particles,time,gl.POINTS,positions.length/2);
        draw(glints,time,gl.TRIANGLES,glintCount*6);
        draw(trails,time,gl.TRIANGLES,trailCount*segments*6);
        gl.disable(gl.BLEND);
        blurInto(scene,glowA,2.5/glowA.w,0);
        blurInto(glowA,glowB,0,2.5/glowB.h);
        gl.bindFramebuffer(gl.FRAMEBUFFER,null);
        gl.viewport(0,0,canvas.width,canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.BLEND);
        gl.bindTexture(gl.TEXTURE_2D,texture);
        gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
        draw(material,time,gl.TRIANGLES,6);
        gl.bindTexture(gl.TEXTURE_2D,scene.texture);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D,glowB.texture);
        gl.blendFuncSeparate(gl.ONE,gl.ONE,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
        draw(composite,time,gl.TRIANGLES,6);
      },
      dispose
    };
  } catch (error) { dispose(); throw error; }
}
