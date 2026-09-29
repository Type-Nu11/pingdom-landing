const quadVertex = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv=vec2(aPosition.x,-aPosition.y)*.56+.5;
  gl_Position=vec4(aPosition,0.0,1.0);
}
`;
const quadFragment = `
precision mediump float;
uniform sampler2D uTexture;
uniform float uOpacity;
varying vec2 vUv;
void main() {
  if(any(lessThan(vUv,vec2(0.0)))||any(greaterThan(vUv,vec2(1.0)))) discard;
  gl_FragColor=texture2D(uTexture,vUv)*uOpacity;
}
`;
const pointVertex = `
attribute vec2 aAnchor;
attribute vec4 aColor;
attribute float aSize;
attribute float aSeed;
uniform vec2 uResolution,uPointer,uVelocity;
uniform float uTime,uStrength,uRadius,uDpr,uMaxSize,uScale;
varying vec4 vColor;
varying float vSize;
void main() {
  vec2 delta=(aAnchor-uPointer)*uResolution;
  float distanceToPointer=length(delta);
  vec2 radial=delta/max(distanceToPointer,1.0);
  vec2 tangent=vec2(-radial.y,radial.x);
  float falloff=1.0-smoothstep(0.0,uRadius,distanceToPointer);
  float ripple=sin(distanceToPointer*.068-uTime*7.4+aSeed*.55);
  float swirl=sin(uTime*4.3+aSeed*.8-distanceToPointer*.025);
  vec2 scatter=vec2(cos(aSeed*6.283),sin(aSeed*6.283));
  vec2 velocity=uVelocity/max(1.0,length(uVelocity)/32.0);
  vec2 offset=radial*(10.0+11.0*ripple)+tangent*swirl*13.0+scatter*5.0+velocity*.38;
  // 캔버스 여백을 넘지 않는 범위에서만 흩어지고 strength 0에서는 anchor와 정확히 일치합니다.
  vec2 edge=min(aAnchor,vec2(1.0)-aAnchor)*uResolution;
  float travel=min(29.0,max(0.0,min(edge.x,edge.y)-aSize));
  offset*=min(1.0,travel/max(length(offset),.001))*falloff*falloff*uStrength;
  vec2 position=aAnchor+offset/uResolution;
  gl_Position=vec4(position.x*2.0-1.0,1.0-position.y*2.0,0.0,1.0);
  gl_PointSize=clamp(aSize*uDpr*uScale,1.0,uMaxSize);
  vColor=aColor;
  vSize=gl_PointSize;
}
`;
const pointFragment = `
precision mediump float;
uniform float uOpacity,uInk;
varying vec4 vColor;
varying float vSize;
void main() {
  float radius=length(gl_PointCoord-vec2(.5));
  float coverage=1.0-smoothstep(.5-.5/max(vSize,1.0),.5,radius);
  float alpha=vColor.a*uOpacity*coverage*mix(1.0,.8,uInk);
  if(alpha<.003) discard;
  vec3 color=mix(vColor.rgb,vec3(.025,.006,.035),uInk);
  gl_FragColor=vec4(color*alpha,alpha);
}
`;

// pointer velocity는 canvas 정규화 좌표/초입니다. 이벤트·RAF·감쇠 수명주기는 호출자가 소유합니다.
export function createHalftoneRenderer(canvas, image) {
  const gl=canvas.getContext('webgl', {
    alpha:true, antialias:false, depth:false, stencil:false,
    premultipliedAlpha:true, powerPreference:'low-power'
  });
  if(!gl) throw new Error('Halftone needs WebGL');
  const shaders=[],programs=[],buffers=[],textures=[];
  let disposed=false,sourcePixels=null,pointCount=0,cssWidth=0,cssHeight=0,dpr=1;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const finite=(value,fallback)=>Number.isFinite(value)?value:fallback;
  function dispose() {
    if(disposed) return;
    disposed=true;
    buffers.forEach(value=>gl.deleteBuffer(value));
    textures.forEach(value=>gl.deleteTexture(value));
    programs.forEach(value=>gl.deleteProgram(value));
    shaders.forEach(value=>gl.deleteShader(value));
    sourcePixels=null;
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
  try {
    function program(vertex,fragment,points) {
      const result=gl.createProgram();
      if(!result) throw new Error('Halftone program allocation failed');
      programs.push(result);
      for(const [type,source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]) {
        const shader=gl.createShader(type);
        if(!shader) throw new Error('Halftone shader allocation failed');
        shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);
        if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader)||'Halftone shader compilation failed');
        gl.attachShader(result,shader);
      }
      gl.bindAttribLocation(result,0,points?'aAnchor':'aPosition');
      if(points) {
        gl.bindAttribLocation(result,1,'aColor');
        gl.bindAttribLocation(result,2,'aSize');
        gl.bindAttribLocation(result,3,'aSeed');
      }
      gl.linkProgram(result);
      if(!gl.getProgramParameter(result,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(result)||'Halftone program link failed');
      return result;
    }
    function buffer() {
      const result=gl.createBuffer();
      if(!result) throw new Error('Halftone buffer allocation failed');
      buffers.push(result);return result;
    }
    const quad=program(quadVertex,quadFragment,false),points=program(pointVertex,pointFragment,true);
    const quadBuffer=buffer(),pointBuffer=buffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const texture=gl.createTexture();
    if(!texture) throw new Error('Halftone texture allocation failed');
    textures.push(texture);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
    const quadOpacity=gl.getUniformLocation(quad,'uOpacity');
    gl.useProgram(quad);gl.uniform1i(gl.getUniformLocation(quad,'uTexture'),0);
    const uniforms={};
    for(const name of ['uResolution','uPointer','uVelocity','uTime','uStrength','uRadius','uDpr','uMaxSize','uOpacity','uScale','uInk']) {
      uniforms[name]=gl.getUniformLocation(points,name);
    }
    const maxPointSize=gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1];
    const sourceWidth=image.naturalWidth||image.width,sourceHeight=image.naturalHeight||image.height;
    if(!sourceWidth||!sourceHeight) throw new Error('Halftone image is not decoded');
    const sampler=canvas.ownerDocument.createElement('canvas');
    sampler.width=sourceWidth;sampler.height=sourceHeight;
    const context=sampler.getContext('2d',{willReadFrequently:true});
    if(!context) throw new Error('Halftone image sampling is unavailable');
    context.drawImage(image,0,0);
    sourcePixels=context.getImageData(0,0,sourceWidth,sourceHeight).data;
    sampler.width=1;sampler.height=1;
    gl.clearColor(0,0,0,0);gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);

    function buildPoints() {
      const imageWidth=cssWidth/1.12,imageHeight=cssHeight/1.12;
      const mobile=(canvas.ownerDocument.defaultView?.innerWidth||cssWidth)<=700;
      let grid=mobile?3.2:5.5,values;
      // 투명 영역을 제외한 실제 점 수를 기준으로 cap을 적용해 낮은 해상도에서 불필요하게 성기지 않습니다.
      do {
        values=[];
        const columns=Math.max(1,Math.floor(imageWidth/grid)),rows=Math.max(1,Math.floor(imageHeight/grid));
        for(let row=0;row<rows;row++) for(let column=0;column<columns;column++) {
          const u=(column+.5)/columns,v=(row+.5)/rows;
          const x=Math.min(sourceWidth-1,Math.floor(u*sourceWidth)),y=Math.min(sourceHeight-1,Math.floor(v*sourceHeight));
          const pixel=(y*sourceWidth+x)*4,alpha=sourcePixels[pixel+3]/255;
          if(alpha<.18) continue;
          const red=sourcePixels[pixel]/255,green=sourcePixels[pixel+1]/255,blue=sourcePixels[pixel+2]/255;
          const luminance=red*.2126+green*.7152+blue*.0722;
          const highlight=clamp((luminance-.12)/.8,0,1);
          // 암부도 검은 점 대신 pink로 남겨 글자 전체 실루엣을 읽을 수 있게 합니다.
          const r=.96+.04*highlight,g=.085+.85*highlight,b=.36+.62*highlight;
          const diameter=grid*(.65+.29*Math.sqrt(luminance));
          const seed=((Math.imul(column+17,73856093)^Math.imul(row+29,19349663))>>>0)/4294967296;
          values.push(.5+(u-.5)/1.12,.5+(v-.5)/1.12,r,g,b,alpha,diameter,seed);
        }
        if(values.length/8>16000) grid*=Math.max(1.05,Math.sqrt(values.length/8/16000));
      } while(values.length/8>16000);
      pointCount=values.length/8;
      gl.bindBuffer(gl.ARRAY_BUFFER,pointBuffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(values),gl.STATIC_DRAW);
    }
    function resize() {
      if(disposed) return;
      const width=Math.max(1,canvas.clientWidth),height=Math.max(1,canvas.clientHeight);
      const ratio=Math.min(canvas.ownerDocument.defaultView?.devicePixelRatio||1,1.5);
      const changed=width!==cssWidth||height!==cssHeight;
      cssWidth=width;cssHeight=height;dpr=ratio;
      const physicalWidth=Math.max(1,Math.round(width*dpr)),physicalHeight=Math.max(1,Math.round(height*dpr));
      if(canvas.width!==physicalWidth||canvas.height!==physicalHeight) { canvas.width=physicalWidth;canvas.height=physicalHeight; }
      gl.viewport(0,0,physicalWidth,physicalHeight);
      if(changed) buildPoints();
    }
    function render(seconds,pointer) {
      if(disposed) return;
      const time=Math.max(0,finite(seconds,0));
      const progress=clamp(time/.9,0,1),blend=progress*progress*(3-2*progress);
      gl.clear(gl.COLOR_BUFFER_BIT);
      if(blend<1) {
        gl.useProgram(quad);gl.bindBuffer(gl.ARRAY_BUFFER,quadBuffer);
        gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
        gl.disableVertexAttribArray(1);gl.disableVertexAttribArray(2);gl.disableVertexAttribArray(3);
        gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
        gl.uniform1f(quadOpacity,1-blend);gl.drawArrays(gl.TRIANGLES,0,6);
      }
      if(blend>0&&pointCount) {
        gl.useProgram(points);gl.bindBuffer(gl.ARRAY_BUFFER,pointBuffer);
        for(let i=0;i<4;i++) gl.enableVertexAttribArray(i);
        gl.vertexAttribPointer(0,2,gl.FLOAT,false,32,0);
        gl.vertexAttribPointer(1,4,gl.FLOAT,false,32,8);
        gl.vertexAttribPointer(2,1,gl.FLOAT,false,32,24);
        gl.vertexAttribPointer(3,1,gl.FLOAT,false,32,28);
        gl.uniform2f(uniforms.uResolution,cssWidth,cssHeight);
        gl.uniform2f(uniforms.uPointer,clamp(finite(pointer?.x,.5),0,1),clamp(finite(pointer?.y,.5),0,1));
        gl.uniform2f(uniforms.uVelocity,clamp(finite(pointer?.velocityX,0),-4,4)*cssWidth,clamp(finite(pointer?.velocityY,0),-4,4)*cssHeight);
        gl.uniform1f(uniforms.uTime,time%4096);
        gl.uniform1f(uniforms.uStrength,clamp(finite(pointer?.strength,0),0,1)*blend);
        gl.uniform1f(uniforms.uRadius,clamp(cssWidth*.13,100,180));
        gl.uniform1f(uniforms.uDpr,dpr);gl.uniform1f(uniforms.uMaxSize,maxPointSize);
        gl.uniform1f(uniforms.uOpacity,blend);
        // 밑점과 밝은 점은 같은 anchor·변위로 이동하며 크기와 색만 다릅니다.
        gl.uniform1f(uniforms.uScale,1.5);gl.uniform1f(uniforms.uInk,1);
        gl.drawArrays(gl.POINTS,0,pointCount);
        gl.uniform1f(uniforms.uScale,1);gl.uniform1f(uniforms.uInk,0);
        gl.drawArrays(gl.POINTS,0,pointCount);
      }
    }
    resize();
    return {resize,render,dispose};
  } catch(error) { dispose();throw error; }
}
