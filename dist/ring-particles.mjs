// 글자와 링을 같은 입자의 출발점/도착점으로 사용합니다. 시간만으로 계산해 프레임 누락에도 경로가 이어집니다.
const noise = `
float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p) {
  vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
vec2 rotate(vec2 p,float a) { return vec2(cos(a)*p.x-sin(a)*p.y,sin(a)*p.x+cos(a)*p.y); }
vec2 ringSpace(vec2 uv) {
  vec2 p=uv-.5;
  return vec2(.913089*p.x-.407760*p.y,(.407760*p.x+.913089*p.y)*1.4);
}
float release(vec2 uv) {
  float front=2.02+(1.0-uv.x)*1.04+noise(uv*vec2(7.0,3.0))*.09;
  float grain=hash(floor(uv*vec2(700.0,210.0)))*.035;
  return front+noise(uv*vec2(90.0,27.0))*.025+grain;
}
float surface(vec2 uv) {
  vec2 p=ringSpace(uv);
  float arc=acos(clamp(-p.x/max(length(p),.001),-1.0,1.0));
  return 4.78+arc*.36+noise(uv*8.0)*.3+noise(uv*35.0)*.13;
}
float material(float t,vec2 uv) { return smoothstep(surface(uv)+.1,surface(uv)+.75,t); }
`;
const vertexCommon = `
precision highp float;
uniform vec2 uViewport,uImage,uCenter,uWord,uWordCenter;
uniform float uTime,uAngle,uDpr,uDotStart;
${noise}
vec4 project(vec2 p) { return vec4((uCenter+p)/uViewport*vec2(2,-2)+vec2(-1,1),0,1); }
`;
const flight = `
vec2 fromRing(vec2 p) { p.y/=1.4; return rotate(rotate(p,-.42)*uImage,uAngle); }
vec3 flight(vec2 target,vec2 origin,vec3 seed,float t) {
  vec2 polar=ringSpace(target+.5);
  float radius=length(polar);
  float born=release(origin);
  float landing=surface(target+.5)+seed.y*.12;
  float age=max(0.0,t-born);
  float p=clamp(age/(landing-born),0.0,1.0);
  float capture=p*p*p*(p*(p*6.0-15.0)+10.0);
  float free=pow(max(0.0,sin(p*3.14159265)),1.8);
  vec2 source=uWordCenter-uCenter+(origin-.5)*uWord;
  // 서로 다른 반경의 흐름이 한 바퀴 미만 감기며 표면에 정착합니다. 양 끝의 속도를 0으로 맞춥니다.
  float theta=atan(polar.y,polar.x)-4.6*(1.0-capture);
  float r=radius+(1.0-capture)*(.21+seed.z*.15);
  vec2 orbit=fromRing(vec2(cos(theta),sin(theta))*r);
  vec2 pos=mix(source,orbit,capture);
  float spread=smoothstep(420.0,800.0,uViewport.x);
  pos+=vec2(uImage.x*mix(.10,.22,spread),-uImage.y*.22)*free;
  float lane=floor(seed.x*7.0)/7.0;
  float streamAngle=-1.6+p*6.2+origin.x*.8+lane*.07;
  float streamRadius=.43+lane*.13+.026*sin(p*8.0+lane*3.0);
  vec2 stream=fromRing(vec2(cos(streamAngle),sin(streamAngle))*streamRadius);
  pos=mix(pos,stream,free*.79*(1.0-smoothstep(.32,.78,p)));
  float wave=p*9.0+lane*6.28318;
  // 대류는 큰 흐름을, 고주파 변위는 가장자리의 미세한 풀림을 만듭니다.
  vec2 curl=vec2(sin(wave+origin.y*3.0),cos(wave*.91+origin.x*3.0));
  vec2 dust=vec2(sin(t*5.0+seed.y*34.0),cos(t*4.3+seed.z*29.0));
  pos+=(curl*uImage.y*(.01+lane*.008)+dust*uImage.y*.005)*free;
  // 立ち上がりの低速区間でも文字の縁から剥がれ、静止した粒子の文字が残らないようにします。
  float peel=smoothstep(0.0,.42,age)*(1.0-smoothstep(.16,.64,p));
  vec2 wind=vec2(1.0,-.3+.17*sin(origin.x*14.0+origin.y*5.0));
  pos+=wind*uImage.x*.075*mix(.48,1.0,spread)*(.35+seed.y*1.45)*peel;
  float loosen=smoothstep(.02,.5,age)*(1.0-smoothstep(.2,.66,p));
  float filament=sin(origin.y*24.0+origin.x*9.0+seed.x*1.7+age*2.4);
  pos+=vec2(sin(seed.z*6.28318+age)*.016,filament*.047)*uImage*loosen;
  float depth=1.0+free*(seed.z-.5)*.9;
  return vec3(pos,depth);
}
float airborne(vec2 target,vec2 origin,float time) {
  float born=release(origin);
  return smoothstep(born-.015,born+.045,time)*(1.0-material(time,target+.5));
}
`;
const particleVertex = `${vertexCommon}${flight}
attribute vec2 aTarget,aOrigin;
attribute vec4 aColor;
attribute vec3 aSeed;
varying vec4 vColor;
varying float vSoft;
void main() {
  vec3 p=flight(aTarget,aOrigin,aSeed,uTime);
  gl_Position=project(p.xy);
  float spark=step(.993,aSeed.z);
  vSoft=step(.98,aSeed.z)*(1.0-spark);
  float age=max(0.0,uTime-release(aOrigin));
  float scatter=smoothstep(.12,.65,age);
  gl_PointSize=uDpr*(.72+aSeed.y*1.25+(spark*3.5+vSoft*12.0)*scatter)*p.z;
  float alpha=airborne(aTarget,aOrigin,uTime);
  vec3 ink=mix(vec3(.965,.941,.988),vec3(1.0,.09,.42),step(uDotStart,aOrigin.x));
  vec3 tint=mix(ink,mix(aColor.rgb,vec3(1.0,.06,.36),.38),smoothstep(.06,.62,age));
  float shimmer=.8+.2*sin(aSeed.x*63.0+uTime*5.0);
  vColor=vec4(tint,alpha*aColor.a*(.43+.32*aSeed.z)*shimmer*mix(1.0,.09,vSoft));
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
attribute vec2 aCorner,aTarget,aOrigin;
attribute vec3 aSeed;
varying vec2 vUv;
varying vec4 vColor;
void main() {
  vec3 p=flight(aTarget,aOrigin,aSeed,uTime);
  vec2 velocity=flight(aTarget,aOrigin,aSeed,uTime+.022).xy-p.xy;
  float speed=min(length(velocity),18.0);
  float lengthPx=1.1+speed*.85;
  float widthPx=(.5+aSeed.z*.8)*p.z;
  float angle=atan(velocity.y,velocity.x+.0001);
  float scale=min(1.0,uViewport.x/700.0);
  gl_Position=project(p.xy+rotate(aCorner*vec2(lengthPx,widthPx)*scale,angle));
  vUv=aCorner;
  vec3 tint=mix(vec3(1.0,.12,.43),vec3(.9,.78,1.0),aSeed.z);
  float alpha=airborne(aTarget,aOrigin,uTime)*smoothstep(.04,.32,uTime-release(aOrigin));
  vColor=vec4(tint,alpha*(.24+.45*aSeed.y));
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
attribute vec2 aTarget,aOrigin,aTrail;
attribute vec3 aSeed;
varying vec2 vTrail;
varying vec4 vColor;
void main() {
  float age=aTrail.x;
  float time=max(release(aOrigin),uTime-age*(.2+aSeed.y*.32));
  vec3 p=flight(aTarget,aOrigin,aSeed,time);
  vec2 velocity=flight(aTarget,aOrigin,aSeed,time+.014).xy-p.xy;
  vec2 normal=vec2(-velocity.y,velocity.x)/max(length(velocity),.001);
  float width=(.25+aSeed.x*.6)*sin(age*3.14159)*min(1.0,uViewport.x/700.0);
  gl_Position=project(p.xy+normal*aTrail.y*width);
  vTrail=aTrail;
  vec3 tint=mix(vec3(1.0,.055,.31),vec3(.73,.57,1.0),aSeed.z);
  float alpha=airborne(aTarget,aOrigin,uTime)*smoothstep(.04,.35,time-release(aOrigin));
  vColor=vec4(tint,alpha*(.1+aSeed.y*.27));
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
const wordVertex = `${vertexCommon}
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv=aPosition+.5;
  gl_Position=project(uWordCenter-uCenter+aPosition*uWord);
}
`;
const wordFragment = `
precision highp float;
uniform sampler2D uTexture;
uniform float uTime;
varying vec2 vUv;
${noise}
void main() {
  vec4 word=texture2D(uTexture,vUv);
  float born=release(vUv);
  float ink=1.0-smoothstep(born-.018,born+.022,uTime);
  float edge=exp(-pow((uTime-born)/.025,2.0));
  vec3 color=word.rgb+vec3(.045,.025,.04)*edge;
  gl_FragColor=vec4(color,word.a*ink*smoothstep(.06,1.0,uTime));
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
  vec4 scene=texture2D(uScene,vUv),glow=texture2D(uGlow,vUv);
  vec3 light=(scene.rgb+glow.rgb*1.7)*1.35;
  gl_FragColor=vec4(light/(vec3(1.0)+light*.48),clamp(scene.a+glow.a,0.0,1.0));
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
  float edge=exp(-pow((uTime-field-.34)/.18,2.0))*.28;
  gl_FragColor=vec4(color.rgb+vec3(1.0,.24,.51)*edge,color.a*material(uTime,vUv));
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
    const wordWidth = Math.min(width * (mobile ? .88 : .67), 1040);
    const wordHeight = wordWidth * .3;
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
      gl.uniform1f(gl.getUniformLocation(program, 'uDotStart'), dotStart);
      gl.uniform2f(gl.getUniformLocation(program, 'uWord'), wordWidth, wordHeight);
      gl.uniform2f(gl.getUniformLocation(program, 'uWordCenter'), width / 2, height * .46);
      return { program, attributes, time: gl.getUniformLocation(program, 'uTime') };
    }

    // 텍스처와 입자의 출발점을 같은 글자 비트맵에서 추출해 교체 순간의 윤곽이 일치합니다.
    const wordCanvas = document.createElement('canvas');
    wordCanvas.width = 1400; wordCanvas.height = 420;
    const wordContext = wordCanvas.getContext('2d', { willReadFrequently: true });
    wordContext.font = '640 320px Pretendard, sans-serif';
    const textWidth = wordContext.measureText('pingdom.').width;
    wordContext.font = `640 ${320 * 1290 / textWidth}px Pretendard, sans-serif`;
    const metrics = wordContext.measureText('pingdom.');
    const textLeft = (1400 - metrics.width) / 2;
    const baseline = (420 + metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;
    const dotX = textLeft + wordContext.measureText('pingdom').width;
    const dotStart = dotX / 1400;
    wordContext.textAlign = 'left'; wordContext.textBaseline = 'alphabetic';
    wordContext.fillStyle = '#f6f0fc';
    wordContext.fillText('pingdom', textLeft, baseline);
    wordContext.fillStyle = '#ff176b';
    wordContext.fillText('.', dotX, baseline);
    const wordPixels = wordContext.getImageData(0, 0, 1400, 420).data;
    const wordPoints = [];
    for (let y = 0; y < 420; y += 2) for (let x = 0; x < 1400; x += 2) {
      if (wordPixels[(y * 1400 + x) * 4 + 3] > 150) wordPoints.push(x / 1400, y / 420);
    }
    if (!wordPoints.length) throw new Error('Intro wordmark unavailable');

    // 색상 샘플링은 초기화 때만 수행하고 매 프레임의 입자 계산은 GPU에서 처리합니다.
    const sample = document.createElement('canvas');
    sample.width = mobile ? 380 : 720; sample.height = Math.round(sample.width * image.naturalHeight / image.naturalWidth);
    const context = sample.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0, sample.width, sample.height);
    const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
    const positions = [], origins = [], colors = [], seeds = [];
    let seed = 1928;
    const random = () => { seed = (1664525*seed+1013904223) >>> 0; return seed/4294967296; };
    for (let y = 0; y < sample.height; y += 2) for (let x = 0; x < sample.width; x += 2) {
      const index = (y*sample.width+x)*4;
      if (pixels[index+3] < 100) continue;
      for (let copy = 0; copy < (mobile ? 1 : 2); copy++) {
        positions.push((x+random()*1.8)/sample.width-.5, (y+random()*1.8)/sample.height-.5);
        const origin = Math.floor(random() * wordPoints.length / 2) * 2;
        origins.push(wordPoints[origin] + random() / 1400, wordPoints[origin + 1] + random() / 420);
        colors.push(pixels[index]/255, pixels[index+1]/255, pixels[index+2]/255, pixels[index+3]/255);
        seeds.push(random(), random(), random());
      }
    }
    const particleProgram = program(particleVertex, particleFragment);
    const particles = pass(particleProgram, [
      attribute(particleProgram, 'aTarget', positions, 2),
      attribute(particleProgram, 'aOrigin', origins, 2),
      attribute(particleProgram, 'aColor', colors, 4),
      attribute(particleProgram, 'aSeed', seeds, 3)
    ]);
    // 속도에 따른 잔광은 삼각형으로 그려 기기별 point-size 제한을 피합니다.
    const glintTargets = [], glintOrigins = [], glintSeeds = [], corners = [];
    const glintCount = mobile ? 650 : 2200;
    const quad = [-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1];
    for (let i = 0; i < glintCount; i++) {
      const target = Math.floor(random()*positions.length/2)*2;
      const glintSeed = [random(), random(), random()];
      for (let j = 0; j < 6; j++) {
        glintTargets.push(positions[target], positions[target+1]);
        glintOrigins.push(origins[target], origins[target+1]);
        glintSeeds.push(...glintSeed);
        corners.push(quad[j*2], quad[j*2+1]);
      }
    }
    const glintProgram = program(glintVertex, glintFragment);
    const glints = pass(glintProgram, [
      attribute(glintProgram, 'aTarget', glintTargets, 2),
      attribute(glintProgram, 'aOrigin', glintOrigins, 2),
      attribute(glintProgram, 'aSeed', glintSeeds, 3),
      attribute(glintProgram, 'aCorner', corners, 2)
    ]);
    const trailTargets = [], trailOrigins = [], trailSeeds = [], trailCoordinates = [];
    const trailCount = mobile ? 80 : 260, segments = 32;
    for (let i = 0; i < trailCount; i++) {
      const target = Math.floor(random()*positions.length/2)*2;
      const seed = [random(), random(), random()];
      for (let j = 0; j < segments; j++) {
        for (const [age, side] of [[j,-1],[j,1],[j+1,-1],[j+1,-1],[j,1],[j+1,1]]) {
          trailTargets.push(positions[target],positions[target+1]);
          trailOrigins.push(origins[target],origins[target+1]);
          trailSeeds.push(...seed);
          trailCoordinates.push(age/segments,side);
        }
      }
    }
    const trailProgram = program(trailVertex, trailFragment);
    const trails = pass(trailProgram, [
      attribute(trailProgram, 'aTarget', trailTargets, 2),
      attribute(trailProgram, 'aOrigin', trailOrigins, 2),
      attribute(trailProgram, 'aSeed', trailSeeds, 3),
      attribute(trailProgram, 'aTrail', trailCoordinates, 2)
    ]);
    const materialProgram = program(materialVertex, materialFragment);
    const material = pass(materialProgram, [attribute(materialProgram, 'aPosition', [-.5,-.5, .5,-.5, -.5,.5, -.5,.5, .5,-.5, .5,.5], 2)]);
    function imageTexture(source) {
      const texture = gl.createTexture(); textures.push(texture);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      return texture;
    }
    const texture = imageTexture(image);
    gl.uniform1i(gl.getUniformLocation(materialProgram, 'uTexture'), 0);
    const wordProgram = program(wordVertex, wordFragment);
    const word = pass(wordProgram, [attribute(wordProgram, 'aPosition', [-.5,-.5, .5,-.5, -.5,.5, -.5,.5, .5,-.5, .5,.5], 2)]);
    const wordTexture = imageTexture(wordCanvas);
    gl.uniform1i(gl.getUniformLocation(wordProgram, 'uTexture'), 0);
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
        gl.bindTexture(gl.TEXTURE_2D,wordTexture);
        draw(word,time,gl.TRIANGLES,6);
        gl.bindTexture(gl.TEXTURE_2D,scene.texture);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D,glowB.texture);
        gl.blendFuncSeparate(gl.ONE,gl.ONE,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
        draw(composite,time,gl.TRIANGLES,6);
      },
      dispose
    };
  } catch (error) { dispose(); throw error; }
}
