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
uniform vec4 uProjection;
uniform vec2 uHandoffOrigin;
uniform float uTime,uStrength,uRadius,uDpr,uMaxSize,uScale,uHandoff;
varying vec4 vColor;
varying float vSize;
void main() {
  vec2 anchor=aAnchor*uProjection.zw+uProjection.xy;
  vec2 delta=(anchor-uPointer)*uResolution;
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
  vec2 position=anchor+offset/uResolution;
  // 같은 하프톤 anchor를 화면 좌표로 이어 받아 출구에서만 바깥으로 펼칩니다.
  float flight=smoothstep(aSeed*.12,.78+aSeed*.12,uHandoff);
  vec2 launch=(anchor-uHandoffOrigin)*uResolution;
  float angle=atan(launch.y,launch.x+.001)+sin(aSeed*91.0)*.34;
  float flightTravel=max(uResolution.x,uResolution.y)*(.54+aSeed*.61)*flight;
  vec2 burst=vec2(cos(angle),sin(angle)*.66+.50)*flightTravel;
  burst.x+=sin(aSeed*39.0+flight*4.0)*flight*(1.0-flight)*90.0;
  position+=burst/uResolution;
  gl_Position=vec4(position.x*2.0-1.0,1.0-position.y*2.0,0.0,1.0);
  gl_PointSize=clamp(aSize*uDpr*uScale*mix(1.0,.34,flight),1.0,uMaxSize);
  vColor=aColor;
  vColor.a*=1.0-smoothstep(.54+aSeed*.17,1.0,uHandoff);
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

const flowVertex = `
attribute vec2 aAnchor,aTarget;
attribute vec4 aColor;
attribute float aSize,aSeed,aCohort;
uniform vec2 uResolution;
uniform vec4 uProjection;
uniform float uProgress,uDpr,uMaxSize,uScale;
varying vec4 vColor;
varying float vSize;
void main() {
  vec2 source=aAnchor*uProjection.zw+uProjection.xy;
  float launch=smoothstep(.018+aCohort*.060+aSeed*.018,.47+aCohort*.060+aSeed*.018,uProgress);
  vec2 target=aTarget;
  vec2 route=target-source;
  vec2 bend=vec2(-route.y,route.x)*(.25+.08*sin(aSeed*6.283));
  vec2 current=vec2(sin(target.y*5.2+uProgress*4.4),sin(target.x*4.6-uProgress*3.6))*vec2(.042,.048);
  vec2 position=mix(source,target,launch)+bend*sin(launch*3.14159265)+current*launch;
  float departure=smoothstep(.61+aCohort*.025+aSeed*.025,.95+aCohort*.012,uProgress);
  vec2 radial=(target-vec2(.5))*vec2(1.0,.78)+vec2(.001);
  vec2 drift=radial/max(length(radial),.001)*vec2(.86,.74)+vec2(.12*sin(target.y*4.0),-.16);
  position+=drift*departure;
  float appear=smoothstep(.005+aCohort*.090,.10+aCohort*.090,uProgress);
  float dissolve=1.0-smoothstep(.73+aSeed*.055+aCohort*.018,.955+aCohort*.010,uProgress);
  // 출발할 때는 원본의 금속성 하이라이트를 보존하고 흐름 안에서는 같은 Pink 계열로 차분하게 이어갑니다.
  float tint=smoothstep(.025,.30,uProgress);
  vec3 pink=vec3(.98,.10,.39)+vec3(.02,.10,.09)*aSeed;
  vColor=vec4(mix(aColor.rgb,pink,tint),aColor.a*appear*dissolve*mix(1.0,.60,aCohort));
  gl_Position=vec4(position.x*2.0-1.0,1.0-position.y*2.0,0.0,1.0);
  // 점의 수명 중 크기를 키우거나 줄이지 않아 첫 화면과 같은 CSS pixel 크기의 원이 남습니다.
  gl_PointSize=clamp(aSize*uDpr*uScale,1.0,uMaxSize);
  vSize=gl_PointSize;
}
`;

// 실제 로고의 점을 순서와 크기·alpha 그대로 이어 받습니다. 두 번째 방출도 같은 점의 지연된 수명이며,
// 화면 전체를 불투명하게 메우는 격자 대신 황금각 분포와 곡선 경로로 공간을 엽니다.
export function buildFlowPoints(width, height, sourcePoints) {
  const sourceCount=Math.floor(sourcePoints.length/8);
  if(!sourceCount||width<=0||height<=0) throw new Error('Flow needs a decoded halftone and viewport');
  const count=sourceCount*2,values=new Float32Array(count*11);
  const goldenAngle=Math.PI*(3-Math.sqrt(5));
  let offset=0;
  for(let cohort=0;cohort<2;cohort++) for(let index=0;index<sourceCount;index++) {
    const source=index*8;
    for(let channel=0;channel<8;channel++) values[offset++]=sourcePoints[source+channel];
    const radius=Math.sqrt((index+.5)/sourceCount)*.76;
    const angle=index*goldenAngle+cohort*.73;
    values[offset++]=.5+Math.cos(angle)*radius;
    values[offset++]=.5+Math.sin(angle)*radius;
    values[offset++]=cohort;
  }
  return { values, count };
}

// pointer velocity는 canvas 정규화 좌표/초입니다. 이벤트·RAF·감쇠 수명주기는 호출자가 소유합니다.
export function createHalftoneRenderer(canvas, image, options = {}) {
  const gl=canvas.getContext('webgl', {
    alpha:true, antialias:false, depth:false, stencil:false,
    premultipliedAlpha:true, powerPreference:'low-power'
  });
  if(!gl) throw new Error('Halftone needs WebGL');
  const shaders=[],programs=[],buffers=[],textures=[];
  let disposed=false,sourcePixels=null,pointCount=0,cssWidth=0,cssHeight=0,dpr=1;
  let sampleWidth=options.sampleWidth||0,sampleHeight=options.sampleHeight||0;
  let flowPointCount=0;
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
    function program(vertex,fragment,points,flow=false) {
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
        if(flow) { gl.bindAttribLocation(result,4,'aTarget');gl.bindAttribLocation(result,5,'aCohort'); }
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
    const flow=options.exitFlow?program(flowVertex,pointFragment,true,true):null;
    const flowBuffer=flow?buffer():null;
    const flowUniforms={};
    if(flow) for(const name of ['uResolution','uProjection','uProgress','uDpr','uMaxSize','uScale','uOpacity','uInk'])
      flowUniforms[name]=gl.getUniformLocation(flow,name);
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
    for(const name of ['uResolution','uPointer','uVelocity','uProjection','uHandoffOrigin','uHandoff','uTime','uStrength','uRadius','uDpr','uMaxSize','uOpacity','uScale','uInk']) {
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
      const imageWidth=sampleWidth||cssWidth/1.12,imageHeight=sampleHeight||cssHeight/1.12;
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
      if(flow) {
        const cloud=buildFlowPoints(cssWidth,cssHeight,values);
        flowPointCount=cloud.count;
        gl.bindBuffer(gl.ARRAY_BUFFER,flowBuffer);
        gl.bufferData(gl.ARRAY_BUFFER,cloud.values,gl.STATIC_DRAW);
      }
    }
    function resize(sampling = {}) {
      if(disposed) return;
      const nextSampleWidth=finite(sampling.sampleWidth,sampleWidth),nextSampleHeight=finite(sampling.sampleHeight,sampleHeight);
      const width=Math.max(1,canvas.clientWidth),height=Math.max(1,canvas.clientHeight);
      const ratio=Math.min(canvas.ownerDocument.defaultView?.devicePixelRatio||1,1.5);
      const changed=width!==cssWidth||height!==cssHeight||nextSampleWidth!==sampleWidth||nextSampleHeight!==sampleHeight;
      sampleWidth=nextSampleWidth;sampleHeight=nextSampleHeight;
      cssWidth=width;cssHeight=height;dpr=ratio;
      const physicalWidth=Math.max(1,Math.round(width*dpr)),physicalHeight=Math.max(1,Math.round(height*dpr));
      if(canvas.width!==physicalWidth||canvas.height!==physicalHeight) { canvas.width=physicalWidth;canvas.height=physicalHeight; }
      gl.viewport(0,0,physicalWidth,physicalHeight);
      if(changed) buildPoints();
    }
    function render(seconds,pointer,handoff) {
      if(disposed) return;
      const time=Math.max(0,finite(seconds,0));
      const progress=clamp(time/.9,0,1),blend=progress*progress*(3-2*progress);
      const exitProgress=clamp(finite(handoff?.progress,0),0,1);
      const basePhase=clamp((exitProgress-.005)/.095,0,1);
      const baseVisibility=flow&&handoff?1-basePhase*basePhase*(3-2*basePhase):1;
      gl.clear(gl.COLOR_BUFFER_BIT);
      if(blend<1) {
        gl.useProgram(quad);gl.bindBuffer(gl.ARRAY_BUFFER,quadBuffer);
        gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
        gl.disableVertexAttribArray(1);gl.disableVertexAttribArray(2);gl.disableVertexAttribArray(3);
        gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
        gl.uniform1f(quadOpacity,1-blend);gl.drawArrays(gl.TRIANGLES,0,6);
      }
      if(blend>0&&pointCount&&baseVisibility>0) {
        gl.useProgram(points);gl.bindBuffer(gl.ARRAY_BUFFER,pointBuffer);
        for(let i=0;i<4;i++) gl.enableVertexAttribArray(i);
        gl.vertexAttribPointer(0,2,gl.FLOAT,false,32,0);
        gl.vertexAttribPointer(1,4,gl.FLOAT,false,32,8);
        gl.vertexAttribPointer(2,1,gl.FLOAT,false,32,24);
        gl.vertexAttribPointer(3,1,gl.FLOAT,false,32,28);
        gl.uniform2f(uniforms.uResolution,cssWidth,cssHeight);
        const projection=handoff?.projection;
        gl.uniform4f(uniforms.uProjection,finite(projection?.left,0),finite(projection?.top,0),finite(projection?.width,1),finite(projection?.height,1));
        gl.uniform2f(uniforms.uHandoffOrigin,finite(handoff?.origin?.x,.5),finite(handoff?.origin?.y,.5));
        gl.uniform1f(uniforms.uHandoff,flow?0:exitProgress);
        gl.uniform2f(uniforms.uPointer,clamp(finite(pointer?.x,.5),0,1),clamp(finite(pointer?.y,.5),0,1));
        gl.uniform2f(uniforms.uVelocity,clamp(finite(pointer?.velocityX,0),-4,4)*cssWidth,clamp(finite(pointer?.velocityY,0),-4,4)*cssHeight);
        gl.uniform1f(uniforms.uTime,time%4096);
        gl.uniform1f(uniforms.uStrength,clamp(finite(pointer?.strength,0),0,1)*blend);
        gl.uniform1f(uniforms.uRadius,clamp(cssWidth*.13,100,180));
        gl.uniform1f(uniforms.uDpr,dpr);gl.uniform1f(uniforms.uMaxSize,maxPointSize);
        gl.uniform1f(uniforms.uOpacity,blend*baseVisibility);
        // 밑점과 밝은 점은 같은 anchor·변위로 이동하며 크기와 색만 다릅니다.
        gl.uniform1f(uniforms.uScale,1.5);gl.uniform1f(uniforms.uInk,1);
        gl.drawArrays(gl.POINTS,0,pointCount);
        gl.uniform1f(uniforms.uScale,1);gl.uniform1f(uniforms.uInk,0);
        gl.drawArrays(gl.POINTS,0,pointCount);
      }
      if(flow&&handoff&&exitProgress>0&&exitProgress<.97&&flowPointCount) {
        gl.useProgram(flow);gl.bindBuffer(gl.ARRAY_BUFFER,flowBuffer);
        for(let i=0;i<6;i++) gl.enableVertexAttribArray(i);
        gl.vertexAttribPointer(0,2,gl.FLOAT,false,44,0);
        gl.vertexAttribPointer(1,4,gl.FLOAT,false,44,8);
        gl.vertexAttribPointer(2,1,gl.FLOAT,false,44,24);
        gl.vertexAttribPointer(3,1,gl.FLOAT,false,44,28);
        gl.vertexAttribPointer(4,2,gl.FLOAT,false,44,32);
        gl.vertexAttribPointer(5,1,gl.FLOAT,false,44,40);
        const projection=handoff.projection;
        gl.uniform2f(flowUniforms.uResolution,cssWidth,cssHeight);
        gl.uniform4f(flowUniforms.uProjection,finite(projection?.left,0),finite(projection?.top,0),finite(projection?.width,1),finite(projection?.height,1));
        gl.uniform1f(flowUniforms.uProgress,exitProgress);
        gl.uniform1f(flowUniforms.uDpr,dpr);gl.uniform1f(flowUniforms.uMaxSize,maxPointSize);
        gl.uniform1f(flowUniforms.uOpacity,1);
        // 첫 로고와 동일한 밑점·밝은 점의 두 pass를 사용하며 위치와 수명은 함께 움직입니다.
        gl.uniform1f(flowUniforms.uScale,1.5);gl.uniform1f(flowUniforms.uInk,1);
        gl.drawArrays(gl.POINTS,0,flowPointCount);
        gl.uniform1f(flowUniforms.uScale,1);gl.uniform1f(flowUniforms.uInk,0);
        gl.drawArrays(gl.POINTS,0,flowPointCount);
        gl.disableVertexAttribArray(4);gl.disableVertexAttribArray(5);
      }
    }
    resize();
    return {resize,render,dispose,getStats:()=>({pointCount,flowPointCount})};
  } catch(error) { dispose();throw error; }
}
