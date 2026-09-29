const vertexSource = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  // 캔버스 여백 안에서 변형해 원본 가장자리가 잘리지 않게 합니다.
  vUv=vec2(aPosition.x,-aPosition.y)*.56+.5;
  gl_Position=vec4(aPosition,0.0,1.0);
}
`;
const fragmentSource = `
precision highp float;
uniform sampler2D uTexture;
uniform float uTime;
varying vec2 vUv;
void main() {
  float phase=uTime*.42;
  float enter=smoothstep(0.0,2.4,uTime);
  float edge=smoothstep(0.0,.08,vUv.x)*(1.0-smoothstep(.92,1.0,vUv.x));
  // 글자의 가독성을 지키면서 금속 표면에 작은 파동과 반사광만 순환시킵니다.
  vec2 wave=vec2(.0015*sin(vUv.y*9.0+phase),.004*sin(vUv.x*12.0-phase));
  vec2 uv=vUv+wave*enter*edge;
  if(any(lessThan(uv,vec2(0.0)))||any(greaterThan(uv,vec2(1.0)))) discard;
  vec4 surface=texture2D(uTexture,uv);
  float sheen=pow(.5+.5*cos(vUv.x*9.0-phase-vUv.y*2.0),12.0)*.055;
  float light=1.0+enter*edge*sheen;
  gl_FragColor=vec4(surface.rgb*light,surface.a);
}
`;

export function createRingFlowRenderer(canvas, image) {
  const gl=canvas.getContext('webgl', {
    alpha:true, antialias:false, depth:false, premultipliedAlpha:true, powerPreference:'low-power'
  });
  if(!gl) throw new Error('Ring flow needs WebGL');
  const shaders=[];
  let program,buffer,texture,disposed=false;
  function dispose() {
    if(disposed) return;
    disposed=true;
    if(buffer) gl.deleteBuffer(buffer);
    if(texture) gl.deleteTexture(texture);
    if(program) gl.deleteProgram(program);
    shaders.forEach(shader=>gl.deleteShader(shader));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
  try {
    program=gl.createProgram();
    for(const [type,source] of [[gl.VERTEX_SHADER,vertexSource],[gl.FRAGMENT_SHADER,fragmentSource]]) {
      const shader=gl.createShader(type); shaders.push(shader);
      gl.shaderSource(shader,source); gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
      gl.attachShader(program,shader);
    }
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    buffer=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const position=gl.getAttribLocation(program,'aPosition');
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    texture=gl.createTexture(); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
    gl.uniform1i(gl.getUniformLocation(program,'uTexture'),0);
    const time=gl.getUniformLocation(program,'uTime');
    gl.clearColor(0,0,0,0);
    return {
      resize() {
        // 모델 영역만 그리며 DPR을 제한합니다. 레이아웃 측정은 크기 변경 때만 합니다.
        const dpr=Math.min(window.devicePixelRatio||1,1.5);
        const width=Math.max(1,Math.round(canvas.clientWidth*dpr));
        const height=Math.max(1,Math.round(canvas.clientHeight*dpr));
        if(canvas.width!==width||canvas.height!==height) { canvas.width=width; canvas.height=height; }
        gl.viewport(0,0,width,height);
      },
      render(seconds) {
        if(disposed) return;
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform1f(time,seconds);
        gl.drawArrays(gl.TRIANGLES,0,6);
      },
      dispose
    };
  } catch(error) { dispose(); throw error; }
}

export function createRingFlow({hero}) {
  const canvas=hero.querySelector('.ring-flow-canvas');
  const image=hero.querySelector('.hero-model img');
  let renderer,frame=0,lastTime=null,elapsed=0;
  let paused=true,loading=false,failed=false,disposed=false,needsResize=true;
  function stop() {
    cancelAnimationFrame(frame); frame=0; lastTime=null;
  }
  function fallback() {
    failed=true; stop();
    hero.classList.remove('ring-flow-ready');
    renderer?.dispose(); renderer=null;
  }
  function draw(now) {
    frame=0;
    if(paused||disposed||failed) return;
    if(lastTime!==null) elapsed+=Math.min((now-lastTime)/1000,.064);
    lastTime=now;
    try {
      if(needsResize) { renderer.resize(); needsResize=false; }
      renderer.render(elapsed);
    } catch { fallback(); return; }
    frame=requestAnimationFrame(draw);
  }
  async function resume() {
    if(paused||disposed||failed||loading||frame) return;
    if(!renderer) {
      loading=true;
      try {
        await image.decode();
        if(paused||disposed) return;
        renderer=createRingFlowRenderer(canvas,image);
        renderer.resize(); needsResize=false;
        // 0초는 원본과 동일한 모습으로 그린 후 교체해 인트로 종료 시 점프를 없앱니다.
        renderer.render(0);
        hero.classList.add('ring-flow-ready');
      } catch { fallback(); return; }
      finally { loading=false; }
    }
    frame=requestAnimationFrame(draw);
  }
  const resizeObserver=new ResizeObserver(()=>{ needsResize=true; });
  resizeObserver.observe(canvas);
  canvas.addEventListener('webglcontextlost',fallback);
  return {
    setPaused(value) {
      paused=value;
      if(paused) stop(); else void resume();
    },
    dispose() {
      if(disposed) return;
      disposed=true; stop();
      resizeObserver.disconnect();
      canvas.removeEventListener('webglcontextlost',fallback);
      hero.classList.remove('ring-flow-ready');
      renderer?.dispose(); renderer=null;
    }
  };
}
