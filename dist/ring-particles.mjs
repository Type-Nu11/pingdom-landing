// 기존 링 이미지의 위치·색을 입자의 도착점으로 사용해 재질과 입자가 맞물리게 합니다.
const noise = `
float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p) {
  vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
float surface(vec2 uv) { return (.65*uv.x+.35*(1.0-uv.y))*.4+noise(uv*32.0)*.45+noise(uv*110.0)*.15; }
float material(float t,vec2 uv) { return smoothstep(surface(uv)-.055,surface(uv)+.055,smoothstep(2.1,3.65,t)*1.15-.07); }
vec2 rotate(vec2 p,float a) { return vec2(cos(a)*p.x-sin(a)*p.y,sin(a)*p.x+cos(a)*p.y); }
`;
const vertexCommon = `
precision highp float;
uniform vec2 uViewport,uImage,uCenter;
uniform float uTime,uAngle,uDpr;
${noise}
vec4 project(vec2 p) { return vec4((uCenter+p)/uViewport*vec2(2,-2)+vec2(-1,1),0,1); }
`;
const particleVertex = `${vertexCommon}
attribute vec2 aTarget;
attribute vec4 aColor;
attribute vec3 aSeed;
varying vec4 vColor;
void main() {
  float gather=smoothstep(.15+aSeed.x*.35,2.35+aSeed.y*.25,uTime);
  float loose=1.0-gather;
  vec2 target=aTarget*uImage;
  float spin=loose*(1.4+aSeed.z*.16);
  vec2 p=rotate(target*(1.0+loose*(.1+aSeed.y*.25)),spin);
  p+=vec2(sin(aSeed.x*23.0+uTime*1.7),cos(aSeed.y*19.0-uTime*1.2))*loose*uImage.x*.085;
  float depth=(aSeed.z-.5)*loose*uImage.x*.75;
  float perspective=900.0/(900.0+depth);
  p=rotate(p*perspective,uAngle);
  gl_Position=project(p);
  float glint=step(.985,aSeed.z);
  gl_PointSize=uDpr*(1.5+aSeed.y*1.2+glint*3.5)*mix(1.3,1.0,gather)*perspective;
  float formed=material(uTime,aTarget+.5);
  float alpha=smoothstep(0.0,.5,uTime)*(1.0-formed)*(1.0-smoothstep(3.65,4.0,uTime));
  vec3 tint=mix(aColor.rgb,vec3(1.0,.7,.9),.48);
  vColor=vec4(tint,alpha*aColor.a*(.8+aSeed.x*.2));
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
  float threshold=smoothstep(2.1,3.65,uTime)*1.15-.07;
  float field=surface(vUv);
  float edge=(1.0-smoothstep(0.0,.045,abs(field-threshold)))*.24;
  gl_FragColor=vec4(color.rgb+vec3(1.0,.2,.55)*edge,color.a*smoothstep(field-.055,field+.055,threshold));
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
      },
      dispose
    };
  } catch (error) { dispose(); throw error; }
}
