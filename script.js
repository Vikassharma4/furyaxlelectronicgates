/*  TODO:
*     Matrix
*     Overview window!
*     
*     Automatic line drawing when drawn from input/output
*     link parsing
*     Make dragging board edit history without adding new keyframe
*/

var canvas=document.getElementById("playarea"),ctx=canvas.getContext("2d");
var context=document.getElementById("context");
var submenus=document.getElementsByClassName("submenu");
var acc=10,size=4,hoverID=-1,clickID=-1;
var startX=0,startY=0,curX=0,curY=0;
var pressed=false,drawing=false,editable=true,draggable=false,simulating=false,moveLabel=false;
var lines=[],tmpLines=[],lineFill=[],selLines=[];
var moveElems=[],toDelete=null;
var gates=[],activeGates=[],activeLines=[];
var cluster=[],clusterIndex=[];
var types=[
  {
    family: "Inputs",
    members: [
      {
        name: "boolean",
        desc: "Toggle switch"
      },
      {
        name: "boolean toggle",
        desc: "Push switch"
      },
      {
        name: "boolean const0",
        desc: "Constant low"
      },
      {
        name: "boolean const1",
        desc: "Constant high"
      }
    ]
  },
  {
    family: "Gates",
    members: [
      {
        name: "and",
        desc: "AND gate",
        svg: "<path d='M2 2 L35 2 Q58 2 58 hh Q58 sh 35 sh L2 sh Z'/>"
      },
      {
        name: "not and",
        desc: "NAND gate",
        svg: "<path d='M2 2 L25 2 Q50 2 48 hh Q50 sh 25 sh L2 sh Z'/><circle cx='53' cy='hh' r='5'/>"
      },
      {
        name: "or",
        desc: "OR gate",
        svg: "<path d='M2 2 L10 2 Q45 2 58 hh Q45 sh 10 sh L2 sh Z'/>"
      },
      {
        name: "not or",
        desc: "NOR gate",
        svg: "<path d='M2 2 L10 2 Q35 2 48 hh Q35 sh 10 sh L2 sh Z'/><circle cx='53' cy='hh' r='5'/>"
      },
      {
        name: "xor",
        desc: "XOR gate",
        svg: "<path d='M8 2 L10 2 Q45 2 58 hh Q45 sh 10 sh L8 sh Z'/><path d='M2 0 L2 rh'/>"
      },
      {
        name: "not xor",
        desc: "XNOR gate",
        svg: "<path d='M8 2 L10 2 Q35 2 48 hh Q35 sh 10 sh L8 sh Z'/><path d='M2 0 L2 rh'/><circle cx='53' cy='hh' r='5'/>"
      },
      {
        name: "not",
        desc: "NOT gate",
        svg: "<path d='M2 2 L48 hh L2 sh Z'></path><circle cx='53' cy='hh' r='5'/>"
      }
    ]
  },
  {
    family: "Outputs",
    members: [
      {
        name: "led",
        desc: "LED"
      },
      {
        name: "bicolor led",
        desc: "Bi-color LED"
      },
      {
        name: "display",
        desc: "Display"
      }
    ]
  },
  {
    family: "Multiplexers",
    members: [
      {
        name: "mux",
        desc: "Multiplexer"
      },
      {
        name: "demux",
        desc: "Demultiplexer"
      }
    ]
  },
  {
    family: "Various",
    members: [
      {
        name: "label",
        desc: "Label"
      }
    ]
  }
];
var prevX=0,prevY=0,absX=0,absY=0,offsetX=0,offsetY=0;
var errCodes=["Value mismatch error"],hide=null;
var svgGate=true;
var hist=[],histPointer=-1;
var title=null,prevSave="";
var blank="cID=&coords=&wires=&offset=";
var filenames=[];
var last="boolean";

function init(){
  document.body.addEventListener("mousedown",function(event){prevX=event.clientX; prevY=event.clientY; grasp(event);});
  document.body.addEventListener("mousemove",function(event){move(event); gateUpdate();});
  document.body.addEventListener("mouseup",function(event){drop(event); gateUpdate(); updateData();});
  document.body.addEventListener("keydown",function(event){keyPress(event);});
  document.getElementById("context").addEventListener("mouseup",function(event){event.stopPropagation();});
  document.getElementById("toolmenu").addEventListener("mousedown",function(event){event.stopPropagation();});
  document.getElementById("toolmenu").addEventListener("mouseup",function(event){event.stopPropagation();});
  var fields=document.getElementsByClassName("searchfield");
  for (var i=0;i<fields.length;i++){
    fields[i].addEventListener("keyup",function(event){search(event);});
  }
  
  var inner=document.getElementsByClassName("wrapper")[0].innerHTML;
  for (var i=0;i<types.length;i++){
    inner+="<div class='tab' expanded='true'><div class='tabexpando' onclick='toggleExpando(this)'>"+types[i].family+"</div>";
    for (var n=0;n<types[i].members.length;n++){
      inner+="<div class='selectbox' onclick=\"genElement('"+types[i].members[n].name+"'); setButtons(0);\">";
      inner+=genElement(types[i].members[n].name,true).outerHTML+"<div class='desc'>"+types[i].members[n].desc+"</div></div>";
    }
    inner+="</div>";
  }
  inner+="<div id='credits'>©"+new Date().getFullYear()+"  <a href='https://vikassharma-air-video.blogspot.com/'>VIKASSHARMA.AIR</a></div>";
  document.getElementsByClassName("wrapper")[0].innerHTML=inner;
  var options=document.createElement("div");
  options.id="gateoptions";
  options.innerHTML="<div id='gatestyle'>Gate style:</div><select id='gatedropdown' onchange='changeGate(this)'><option>Distinctive</option><option>Rectangular</option></select>";
  var tab=document.getElementsByClassName("tab")[1];
  tab.insertBefore(options,tab.children[1]);
  moveLabel=false;
  var url=window.location.href;
  if (url.includes("cID")){
    parseData(url);
  }
  saveHistory();
  var names=localStorage.getItem("filenames");
  prevSave=hist[histPointer];
  updateBtns();
  if (names!=null){
    filenames=names.split(",");
  }
}

function grasp(evt){
  var shiftX=Math.floor((evt.clientX-offsetX)/acc+0.5)*acc+offsetX,shiftY=Math.floor((evt.clientY-offsetY)/acc+0.5)*acc+offsetY;
  startX=shiftX;
  startY=shiftY;
  if (context.style.display!="block"){pressed=true;}
  if (evt.which!=1){
    closeContext();
    openContext(evt);
  }
  if (getID(evt.target.getAttribute("type"))!=null){
    if (evt.target.getAttribute("selected")=="false"){moveElems=domToNum(evt.target);}
    if (editable){setButtons(0);}
  }
  if (moveElems.length!=0){
    if (gates[moveElems[0]].dom.className=="gateinput"||gates[moveElems[0]].dom.className=="gateoutput"){
      moveElems=[];
      setButtons(1);
    }
  }
  if (!contElem(document.getElementById("maincontent").children,evt.target)&&!evt.ctrlKey){
    for (var i=0;i<gates.length;i++){
      gates[i].dom.setAttribute("selected",false);
    }
    selLines=[];
  }
  var ss=document.getElementById("selectsquare").style;
  ss.display="none";
  ss.width=0;
  ss.height=0;
  prevX=evt.clientX;
  prevY=evt.clientY;
  if (moveElems.length!=0&&!draggable){
    gates[moveElems[0]].dom.style.zIndex=1000;
  }
}

function move(evt){
  if (document.getElementById("shadow").style.display=="flex"){return;}
  var x=evt.clientX,y=evt.clientY;
  var shiftX=Math.floor((x-offsetX)/acc+0.5)*acc+offsetX,shiftY=Math.floor((y-offsetY)/acc+0.5)*acc+offsetY;
  curX=x;
  curY=y;
  var dX=x-prevX,dY=y-prevY;
  if (draggable&&pressed){
    ctx.clearRect(0,0,window.innerWidth,window.innerHeight);
    for (var i=0;i<gates.length;i++){
      var gate=gates[i].dom;
      gates[i].coords[0]+=dX;
      gates[i].coords[1]+=dY;
      gate.style.left=gates[i].coords[0]+"px";
      gate.style.top=gates[i].coords[1]+"px";
      /*gate.style.left=(parseInt(gate.style.left.replace("px",""))+dX)+"px";
      gate.style.top=(parseInt(gate.style.top.replace("px",""))+dY)+"px";*/
    }
    for (var i=0;i<lines.length;i++){
      for (var n=0;n<lines[i].length;n+=2){
        lines[i][n]+=dX;
        lines[i][n+1]+=dY;
      }
    }
    absX+=dX;
    absY+=dY;
    offsetX=(absX+acc*1000000)%acc;
    offsetY=(absY+acc*1000000)%acc;
    setCanvas();
    prevX=x;
    prevY=y;
    showCoords();
  }else if (editable){
    ctx.clearRect(0,0,window.innerWidth,window.innerHeight);
    hoverID=hover(x,y,-1,false);
    if (drawing){
      if (pressed){
        ctx.lineWidth=size;
        var s2=size/2;
        ctx.strokeStyle="#333";
        ctx.fillStyle="#333";
        ctx.fillRect(startX-s2,startY-s2,size,size);
        ctx.fillRect(shiftX-size/2,shiftY-size/2,size,size);
        ctx.beginPath();
        ctx.moveTo(startX,startY);
        var mid=startX+Math.floor((shiftX-startX)/(2*acc))*acc;
        ctx.lineTo(mid,startY);
        ctx.lineTo(mid,shiftY);
        ctx.lineTo(shiftX,shiftY);
        ctx.stroke();
        tmpLines=[startX,startY,mid,startY,mid,shiftY,shiftX,shiftY];
      }else{
        ctx.fillStyle=hoverID==-1?"rgba(0,0,0,0.3)":"rgba(255,255,255,0.5)";
        ctx.fillRect(shiftX-size/2,shiftY-size/2,size,size);
      }
    }else{
      if (pressed&&moveElems.length!=0){
        setCoords(shiftX,shiftY);
        if (moveLabel){
          var elems=document.getElementById("maincontent").children;
          for (var i=0;i<elems.length;i++){
            var rect=elems[i].getBoundingClientRect();
            if (x>=rect.left&&x<=rect.left+rect.width&&y>=rect.top&&y<=rect.top+rect.height&&elems[i].className!="label"){
              for (var n=0;n<elems.length;n++){
                elems[n].setAttribute("selected",i==n);
              }
            }
          }
        }
      }else if(pressed){
        var ss=document.getElementById("selectsquare");
        ss.style.display="block";
        ss.style.left=Math.min(evt.clientX,prevX)+"px";
        ss.style.top=Math.min(evt.clientY,prevY)+"px";
        ss.style.width=Math.abs(evt.clientX-prevX)+"px";
        ss.style.height=Math.abs(evt.clientY-prevY)+"px";
        var rect=ss.getBoundingClientRect();
        if(!evt.ctrlKey){selLines=[];}
        for (var i=0;i<gates.length;i++){
          var dom=gates[i].dom;
          var rect2=dom.getBoundingClientRect();
          if (!evt.ctrlKey){dom.setAttribute("selected",false);}
          if (rect2.left>=rect.left&&rect2.top>=rect.top&&rect2.left+rect2.width<=rect.left+rect.width&&rect2.top+rect2.height<=rect.top+rect.height){
            dom.setAttribute("selected",true);
          }
        }
        for (var i=0;i<lines.length;i++){
          var ok=true;
          for (var n=0;n<lines[i].length;n+=2){
            var coord=lines[i]
            if (coord[n]<rect.left||coord[n]>rect.left+rect.width||coord[n+1]<rect.top||coord[n+1]>rect.top+rect.height){
              ok=false;
              break;
            }
          }
          if (ok&&!evt.ctrlKey||ok&&!contElem(selLines,i)){selLines.push(i);}
        }
      }
    }
  }
  draw();
}

function setCoords(x,y){
  var dX=x-startX,dY=y-startY;
  for (var i=0;i<moveElems.length;i++){
    var gate=gates[moveElems[i]];
    gate.dom.style.left=(gate.coords[0]+dX)+"px";
    gate.dom.style.top=(gate.coords[1]+dY)+"px";
  }
  console.log("Length: "+moveElems.length);
  //moveElem.style.left=x+"px";
  //moveElem.style.top=y+"px";
}

function drop(evt){
  if (tmpLines[0]!=undefined&&(tmpLines[0]!=tmpLines[tmpLines.length-2]||tmpLines[1]!=tmpLines[tmpLines.length-1])&&drawing){
    lines.push(tmpLines);
    tmpLines=[0,0];
  }
  /*if (evt.which==1){
    closeContext();
    setTimeout(function(){
      if (moveElems.length!=0){
        if (gates[moveElems[0]].dom.style.zIndex!="1001"){
          moveElems=[];
        }
      }
    },100);
  }*/
  if (context.style.display!="block"){
    if (document.getElementById("maincontent").className=="select"){setPos(evt.clientX,evt.clientY)};
    moveElems=[]; 
    moveLabel=false;
  }
  
  pressed=false;
  createGroups();
  draw();
  
  document.getElementById("selectsquare").style.display="none";
  hideCoords();
  for (var i=0;i<gates.length;i++){
    if (gates[i].dom.getAttribute("type")=="boolean toggle"){
      if (gates[i].dom.getAttribute("value")=="1"){
        toggleInput(gates[i].dom);
        if (simulating){simulate();}
      }
    }
  }
  if (evt.target.parentElement.id=="maincontent"&&evt.target.style.zIndex!="1001"){
    evt.target.style.zIndex=evt.target.className=="label"?10:0;
  }else if(evt.target.style.zIndex=="1001"){
    evt.target.style.zIndex="1000";
  }
  var sel=null,elems=document.getElementById("maincontent").children;
  for (var i=0;i<elems.length;i++){
    if (elems[i].getAttribute("selected")=="true"){
      sel=elems[i];
    }
  }
  if (sel!=null){
    if (evt.target.className=="label"){
      var tmpElem=evt.target;
      for (var i=0;i<elems.length;i++){
        if (contElem(elems[i].children,evt.target)){
          evt.target.parentElement.removeChild(evt.target);
          break;
        }
      }
      sel.appendChild(tmpElem);
      var rect=sel.getBoundingClientRect(),childRect=evt.target.getBoundingClientRect();
      evt.target.style.left=(childRect.left-rect.left)+"px";
      evt.target.style.top=(childRect.top-rect.top)+"px";
    }
  }
  //childRect=evt.target.getBoundingClientRect();
  moveElems=[];
  for (var i=0;i<gates.length;i++){
    if (gates[i].dom.getAttribute("selected")=="true"){
      moveElems.push(i);
    }
  }
  saveHistory();
}

function setPos(x,y){
  var shiftX=Math.floor((x-offsetX)/acc+0.5)*acc+offsetX,shiftY=Math.floor((y-offsetY)/acc+0.5)*acc+offsetY;
  for (var i=0;i<moveElems.length;i++){
    var gate=gates[moveElems[i]];
    gate.coords[0]+=(shiftX-startX);
    gate.coords[1]+=(shiftY-startY);
  }
}

function showCoords(){
  var coords=document.getElementById("coords");
  coords.style.opacity=1;
  coords.style.transitionDelay="0s";
  coords.innerHTML="[&nbsp;"+(absX)+"&nbsp;,&nbsp;"+absY+"&nbsp;]";
}

function hideCoords(){
  var coords=document.getElementById("coords").style;
  coords.opacity=0;
  coords.transitionDelay="1s";
}

function saveHistory(){
  var histStr=genData();
  if (histStr!=hist[histPointer]&&!simulating){
    if (histPointer==hist.length-1){
      hist.push(histStr);
    }else{
      hist[histPointer+1]=histStr;
      //Could've used a single splice, but I do this to be sure it works.
      for (var i=histPointer+2;i<hist.length;i++){
        hist.splice(i,1);
      }
    }
    histPointer++;
  }
  for (var i=0;i<hist.length-1;i++){
    if (hist[i]==hist[i+1]){
      hist.splice(i+1,1);
      if (histPointer>=i+1){
        histPointer--;
      }
      i--;
    }
  }
  if (histPointer==100){
    hist.splice(0,1);
  }
  updateBtns();
}

function historyBack(){
  if (histPointer>0&&!simulating){
    histPointer--;
    finishHistory();
  }
}

function historyForward(){
  if (histPointer<hist.length-1&&!simulating){
    histPointer++;
    finishHistory();
  }
}

function finishHistory(){
  parseData(hist[histPointer]);
  setCanvas();
  draw();
  updateBtns();
  showCoords();
  setTimeout(hideCoords,500);
}

function updateBtns(){
  var actbtns=document.getElementById("toolmenu").querySelectorAll(".actionbutton[sel]");
  actbtns[0].setAttribute("sel",(histPointer!=0&&!simulating));
  actbtns[1].setAttribute("sel",(histPointer!=hist.length-1&&!simulating));
  document.getElementsByClassName("optionbutton")[3].setAttribute("sel",shouldSave());
  if (title!=null){
    setTitle();
  }
}

function setCanvas(){
  var w=window.innerWidth,h=window.innerHeight;
  canvas.width=w;
  canvas.height=h;
  canvas.style.width=w+"px";
  canvas.style.height=h+"px";
  var tcanvas=document.getElementById("grid"),tctx=tcanvas.getContext("2d");
  tcanvas.width=w;
  tcanvas.height=h;
  tcanvas.style.width=w+"px";
  tcanvas.style.height=h+"px";
  tctx.strokeStyle="#ddd";
  tctx.lineWidth=1;
  var lineDiff=6;
  for (var h2=offsetY;h2<h;h2+=acc){
    tctx.strokeStyle=(absY+lineDiff*100000*acc)%(lineDiff*acc)==h2%(lineDiff*acc)?"#aaf":"#ddf";
    tctx.beginPath();
    tctx.moveTo(0,h2);
    tctx.lineTo(w,h2);
    tctx.stroke();
  }
  for (var w2=offsetX;w2<w;w2+=acc){
    tctx.strokeStyle=(absX+lineDiff*100000*acc)%(lineDiff*acc)==w2%(lineDiff*acc)?"#aaf":"#ddf";
    tctx.beginPath();
    tctx.moveTo(w2,0);
    tctx.lineTo(w2,h);
    tctx.stroke();
  }
  draw();
}

window.onresize=function(){
  setCanvas();
};

function draw(){
  ctx.lineWidth=size;
  var s2=size/2;
  var nextLine=0;
  for (var i=0;i<lines.length;i++){
    //ctx.strokeStyle=(i==hoverID||i==clickID)?"#009":"#999";
    var style="#999";
    if (clusterIndex[i]==clusterIndex[hoverID]&&selLines.length==0){
      style=i==hoverID?"#07B":"#009";
    }
    if (i==selLines[nextLine]){
      style="#07B";
      nextLine++;
    }
    if (lineFill[i]!=null){
      style=lineFill[i]==0?"#900":"#090";
    }
    ctx.strokeStyle=style;
    ctx.fillStyle=style;
    var len=lines[i].length;
    ctx.fillRect(lines[i][0]-s2,lines[i][1]-s2,size,size);
    ctx.fillRect(lines[i][len-2]-s2,lines[i][len-1]-s2,size,size);
    ctx.beginPath();
    ctx.moveTo(lines[i][0],lines[i][1]);
    for (var n=2;n<lines[i].length;n+=2){
      ctx.lineTo(lines[i][n],lines[i][n+1]);
    }
    ctx.stroke();
  }
}

function hover(x,y,ignore,all){
  var shiftX=Math.floor((x-offsetX)/acc+0.5)*acc+offsetX,shiftY=Math.floor((y-offsetY)/acc+0.5)*acc+offsetY;
  var every=[];
  for (var i=lines.length-1;i>=0;i--){
    for (var n=0;n<lines[i].length-2;n+=2){
      if (shiftX>=Math.min(lines[i][n],lines[i][n+2])&&shiftX<=Math.max(lines[i][n],lines[i][n+2])&&shiftY>=Math.min(lines[i][n+1],lines[i][n+3])&&shiftY<=Math.max(lines[i][n+1],lines[i][n+3])){
        if (i!=ignore&&!all){return i;}
        else if (all){every.push(i)}
      }
    }
  }
  if(!all){return -1;}
  else{return every;}
}

function toggleInput(elem){
  var val=elem.getAttribute("value")=="1"?0:1;
  elem.setAttribute("value",val);
  var elems=elem.getElementsByClassName("gateoutput");
  for (var i=0;i<elems.length;i++){
    elems[i].setAttribute("state",val);
  }
  if (simulating){simulate();}
}

function openContext(evt){
  if (simulating){return;}
  var selection=[[2],[1],[0,1],[3,4]];
  var clustRem=document.getElementsByClassName("contextitem")[1];
  clustRem.style.display="none";
  if (hoverID!=-1){
    var len=cluster[clusterIndex[hoverID]].length;
    if (len>1){
      clustRem.style.display="block"; clustRem.innerHTML="Delete wires ("+len+")";
    }
  }
  var type=0;
  if (evt.target.getAttribute("type")=="not"){type=1;}
  else if (evt.target.className=="gate"){type=2;}
  else if (evt.target.className=="module"){
    if (evt.target.getAttribute("type").includes("mux")){type=3;}
  }
  
  var items=[],chevrons=document.getElementsByClassName("chevron");
  for (var i=0;i<chevrons.length;i++){
    items.push(chevrons[i].parentElement);
  }
  for (var i=0;i<items.length;i++){items[i].style.display="none";}
  var expr=evt.target.className=="gate"||evt.target.className=="input"||evt.target.className=="module";
  if (expr||hoverID!=-1){
    var del=document.getElementsByClassName("contextitem")[0];
    del.innerHTML="Delete "+(expr?evt.target.className:"wire");
    toDelete=evt.target;
    context.style.display="block";
    for (var i=0;i<selection[type].length;i++){
      items[selection[type][i]].style.display="block";
    }
    var rect=context.getBoundingClientRect();
    context.style.left=((evt.clientX+rect.width+20<window.innerWidth)?evt.clientX+15:evt.clientX-rect.width-15)+"px";
    context.style.top=((evt.clientY+rect.height+70<window.innerHeight)?evt.clientY+15:evt.clientY-rect.height-15)+"px";
  }
  if (type==0&&evt.target.className!="module"){
    items[2].style.display="none";
  }
  clickID=hoverID;
}

function closeContext(){
  context.style.display="none";
  for (var i=0;i<submenus.length;i++){submenus[i].style.display="none";}
}

function setSelected(){
  var submenus=document.getElementsByClassName("submenu");
  for (var n=0;n<submenus.length;n++){
    var items=submenus[n].getElementsByClassName("submenuitem");
    for (var i=0;i<items.length;i++){
      if (items[i].getAttribute("selected")==""){
        items[i].removeAttribute("selected");
      }
    }
    if (n==0){
      var num=gates[moveElems[0]].dom.getElementsByClassName("gateinput").length;
      items[(num>1&&num<=8?num:2)-2].setAttribute("selected","");
    }else if (n==1){
      var type=gates[moveElems[0]].dom.getAttribute("type");
      for (var m=0;m<types[1].members.length;m++){
        if (types[1].members[m].name==type){
          items[m].setAttribute("selected","");
          break;
        }
      }
    }else if (n==2){
      var dirs=["left","top","right","bottom"];
      var inp=gates[moveElems[0]].dom.getElementsByClassName("gateinput");
      var dir=inp.length!=0?inp[0].getAttribute("pos"):null;
      for (var m=0;m<4;m++){
        if (dir==dirs[m]){
          items[m].setAttribute("selected","");
          break;
        }
      }
    }else if (n==3){
      var type=gates[moveElems[0]].dom.getAttribute("type");
      var index=Math.floor(Math.log(moveElem.getElementsByClassName(type=="mux"?"gateinput":"gateoutput").length)/Math.log(2))-1;
      items[index].setAttribute("selected","");
    }else if (n==4){
      var inps=gates[moveElems[0]].dom.getElementsByClassName("gateinput");
      items[inps[inps.length-(type=="mux"?1:2)].getAttribute("pos")=="bottom"?0:1].setAttribute("selected","");   //type=="mux"?1:2 FIX THIS!
    }
  }
}

function genElement(id,returnHTML){
  var elem=null;
  var parent=document.getElementById("maincontent");
  if (id.includes("boolean")){
    elem=document.createElement("div");
    elem.className="input";
    elem.setAttribute("type","boolean");
    elem.setAttribute("value",id.includes("const1")?1:0);
    if (!id.includes("boolean const")){
      elem.addEventListener("mousedown",function(event){
        if (event.target.className=="input"){
          moveElems=domToNum(event.target);
          toggleInput(gates[moveElems[0]].dom);
        }else{
          setButtons(1);
        }
      });
    }
    elem.innerHTML=document.getElementById("booleanbuffer").innerHTML;
    if (id.includes("const1")){
      var outs=elem.getElementsByClassName("gateoutput");
      console.log(outs);
      for (var i=0;i<outs.length;i++){
        outs[i].setAttribute("state",1);
      }
    }
  }else if(id=="display"||id.includes("led")){
    var tmpID=id.includes("led")?"led":id;
    elem=document.createElement("div");
    elem.className="module";
    elem.innerHTML=document.getElementById(tmpID+"buffer").innerHTML;
  }else if(id.includes("mux")){
    elem=document.createElement("div");
    elem.className="module";
    elem.setAttribute("pins",2);
    if (id=="mux"){
      elem.innerHTML+=document.getElementById("muxbuffer").innerHTML;
      elem.style="";
    }else{
      elem.innerHTML=document.getElementById("demuxbuffer").innerHTML;
    }
  }else if(id=="label"){
    elem=document.createElement("div");
    elem.className="label";
    elem.innerHTML="label";
    moveLabel=true;
  }else{
    elem=document.createElement("div");
    elem.className="gate";
    elem.setAttribute("svg_enabled",svgGate);
    inputSet(elem,id=="not"?1:2);
    setSvg(elem,id);
  }
  elem.setAttribute("type",id);
  elem.setAttribute("selected",false);
  
  if (returnHTML){
    elem.setAttribute("preview","");
    return elem;
  }
  elem.addEventListener("mousedown",function(event){
    if (context.style.display!="block"&&!pressed){
      moveLabel=event.target.className=="label";}
    else{
      setPos(event.clientX,event.clientY)
    }
  });
  elem.addEventListener("mouseup",function(event){
    pressed=false;
  });
  parent.appendChild(elem);
  elem.style.zIndex=1001;
  pressed=true;
  var shiftX=Math.floor((curX-offsetX)/acc+0.5)*acc+offsetX,shiftY=Math.floor((curY-offsetY)/acc+0.5)*acc+offsetY;
  gates.push({
    dom:elem,
    coords:[shiftX,shiftY],
    state:null,
    inputC:[],
    inputI:[],
    inputV:[],
    outputC:[],
    outputI:[],
    outputV:[]
  });
  moveElems=domToNum(elem);
  last=id;
  elem.style.left=shiftX+"px";
  elem.style.top=shiftY+"px";
}

function deleteElement(){
  if (clickID==-1){
    if (toDelete.id!="maincontent"){
      toDelete.parentElement.removeChild(toDelete);
      for (var i=0;i<gates.length;i++){
        if (gates[i].dom==toDelete){
          gates.splice(i,1);
          break;
        }
      }
    }
  }else{
    lines.splice(clickID,1);
    lineFill.splice(clickID,1);
    createGroups();
  }
  pressed=false;
  gateUpdate();
  updateData();
  closeContext();
}

function deleteWires(){
  var clust=sort(cluster[clusterIndex[clickID]]);
  for (var i=clust.length-1;i>=0;i--){
    lines.splice(clust[i],1);
  }
  createGroups();
  closeContext();
}

function sort(arr){
  for (var i=0;i<arr.length;i++){
    for (var j=i+1;j<arr.length;j++){
      if (arr[i]>arr[j]){
        var tmp=arr[i];
        arr[i]=arr[j];
        arr[j]=tmp;
      }
    }
  }
  return arr;
}

function toggleSubmenu(elem,id){
  var elem2=submenus[id];
  if (elem2.style.display!="block"){for (var i=0;i<submenus.length;i++){submenus[i].style.display="none";}}
  elem2.style.display=(elem2.style.display=="block")?"none":"block";
  var rect=elem.getBoundingClientRect(),rect2=elem2.getBoundingClientRect();
  elem2.style.left=((rect.left+rect.width+rect2.width<window.innerWidth)?rect.left+rect.width:rect.left-rect2.width)+"px";
  elem2.style.top=((rect.top+rect2.height<window.innerHeight-50)?rect.top:(rect.top+rect.height-rect2.height+1))+"px";
  console.log(rect2);
  setSelected();
}

function setSvg(elem,id){
  var svg="";
  var h=10+20*Math.max(elem.getElementsByClassName("gateinput").length,2);
  for (var i=0;i<types[1].members.length;i++){
    if (types[1].members[i].name==id){
      svg+="<svg width='60' height='"+h+"'>";
      svg+=types[1].members[i].svg.replace(/hh/g,(h/2)).replace(/sh/g,(h-2)).replace(/rh/g,h);
      svg+="</svg>";
    }
  }
  elem.innerHTML=elem.innerHTML+svg;
}

function relayInput(elem,count){
  inputSet(elem,count);
  setSvg(elem,elem.getAttribute("type"));
  if (simulating){simulate();}
}

function inputSet(elem,count){
  var inner="";
  if (count==1){
    inner+="<div class='gateinput' state='null' connected='false' style='top:50%; margin-top:-5px' state='null'></div>";
  }else{
    for (var i=0;i<count;i++){
      inner+="<div class='gateinput' state='null' connected='false'></div>";
    }
  }
  inner+="<div class='gateoutput' state='null' connected='false'></div>";
  elem.innerHTML=inner;
  elem.style.height=(10+20*count)+"px";
  elem.style.marginTop=Math.min(-25,-(10+20*count)/2)+"px";
}

function setType(id){
  gates[moveElems[0]].dom.setAttribute("type",id);
  relayInput(gates[moveElems[0]].dom,id=="not"?1:2);
  if (simulating){simulate();}
}

function gateUpdate(){
  for (var i=0;i<gates.length;i++){
    var dom=gates[i].dom;
    var inputs=dom.getElementsByClassName("gateinput"),outputs=dom.getElementsByClassName("gateoutput");
    var tmpCoords=[],tmpIndex=[],outCoords=[],outIndices=[];
    for (var n=0;n<inputs.length;n++){
      //tmpCoords.push([Math.round(rect.left/acc)*acc,Math.round(rect.top/acc)*acc+((inputs.length>1)?10:20)+20*n]);
      var rect=inputs[n].getBoundingClientRect();
      //tmpCoords.push([Math.round((rect.left+5)/acc)*acc,Math.round((rect.top+5)/acc)*acc]);
      //tmpCoords.push([rect.left+5,rect.top+5]);
      tmpCoords.push([Math.floor((rect.left+5-offsetX)/acc+0.5)*acc+offsetX,Math.floor((rect.top+5-offsetY)/acc+0.5)*acc+offsetY]);
      tmpIndex.push(hover(tmpCoords[n][0],tmpCoords[n][1],-1,false));
      inputs[n].setAttribute("connected",tmpIndex[n]==-1?false:true);
    }
    gates[i].outputV=[];
    for (var n=0;n<outputs.length;n++){
      var rect=outputs[n].getBoundingClientRect();
      outCoords.push([Math.floor((rect.left+5-offsetX)/acc+0.5)*acc+offsetX,Math.floor((rect.top+5-offsetY)/acc+0.5)*acc+offsetY]);
      outIndices.push(hover(outCoords[n][0],outCoords[n][1],-1,false));
      outputs[n].setAttribute("connected",outIndices[n]==-1?false:true);
      var state=outputs[n].getAttribute("state");
      gates[i].outputV.push(isNaN(state)?null:parseInt(state));
    }
    gates[i].inputC=tmpCoords;
    gates[i].inputI=tmpIndex;
    gates[i].outputC=outCoords;
    gates[i].outputI=outIndices;
    //console.log(gates[i]);
  }
}

function updateData(){
  var comps=document.getElementById("maincontent").children.length;
  document.getElementById("innerinfo").innerHTML=comps+" component"+(comps==1?"":"s")+" | "+cluster.length+" wire"+(cluster.length==1?"":"s")+(cluster.length!=lines.length?" ("+lines.length+")":"");
}

function createGroups(){
  cluster=[]
  var cl=[];
  clusterIndex=[];
  var addLater=[];
  
  for (var i=0;i<lines.length;i++){
    var len=lines[i].length;
    cl.push([{
      id: i,
      start: hover(lines[i][0],lines[i][1],i,true),
      end: hover(lines[i][len-2],lines[i][len-1],i,true)
    }]);
  }
  
  var edited;
  
  //main loop
  var ops=0;
  for (var m=0;m<100;m++){
    for (var i=0;i<cl.length;i++){
      for (var i2=0;i2<cl.length;i2++){
        if (i!=i2){
          for (var j=0;j<cl[i].length;j++){
            for (var j2=0;j2<cl[i2].length;j2++){
              ops++;
              if (contElem(cl[i2][j2].start,cl[i][j].id)||contElem(cl[i2][j2].end,cl[i][j].id)){
                appendElems(cl[i],cl[i2]);
                cl[i2]=[];
                edited=true;
              }
            }
          }
        }
      }
    }
    if (!edited){
      break;
    }
  }
  
  for (var i=0;i<cl.length;i++){
    if (cl[i].length==0){
      cl.splice(i,1);
      i--;
    }
  }
  
  for (var i=0;i<cl.length;i++){
    cluster.push([]);
    for (var n=0;n<cl[i].length;n++){
      cluster[i].push(cl[i][n].id);
    }
  }
  
  //console.log(cl);
  
  for (var i=0;i<cluster.length;i++){
    for (var n=0;n<cluster[i].length;n++){
      clusterIndex[cluster[i][n]]=i;
    }
  }
  //console.log(cluster);
}

function contElem(arr,elem){
  for (var i=0;i<arr.length;i++){
    if (arr[i]==elem){return true;}
  }
  return false;
}

function appendElems(arr,arr2){
  for (var i=0;i<arr2.length;i++){
    arr.push(arr2[i]);
  }
  return arr;
}

function simulate(){
  gateUpdate();
  activeGates=[];
  lineFill=[];
  for (var i=0;i<lines.length;i++){
    lineFill.push(null);
  }
  
  for (var i=0;i<gates.length;i++){
    var gate=gates[i];
    for (var n=0;n<gate.outputV.length;n++){
      if (gate.outputV[n]!=null){   //&&gate.dom.className=="input"
        activeGates.push(i);
        break;
      }
    }
  }
  //console.log(activeGates);
  var time=new Date().getTime();
  console.log("----------------");
  for (var i=0;i<50;i++){
    if (activeGates.length==0){console.log("break! ("+i+")"); break;}
    fillLines();
    setGates();
  }
  console.log("time "+(new Date().getTime()-time));
  draw();
  for (var i=0;i<gates.length;i++){
    var gate=gates[i];
    for (var n=0;n<gate.inputC.length;n++){
      var index=hover(gate.inputC[n][0],gate.inputC[n][1],-1,false);
      if (lineFill[index]!=gate.inputV[n]&&index!=-1){
        showError(0);
        return;
      }
    }
    for (var n=0;n<gate.outputC.length;n++){
      var index=hover(gate.outputC[n][0],gate.outputC[n][1],-1,false);
      if (lineFill[index]!=gate.outputV[n]&&index!=-1){
        showError(0);
        return;
      }
    }
  }
  hideError();
}

function fillLines(){
  activeLines=[];
  for (var i=0;i<activeGates.length;i++){
    var i2=activeGates[i];
    var gate=gates[i2];
    //console.log(gate);
    for (var n=0;n<gate.outputV.length;n++){
      if (gate.outputI[n]!=-1){
        var applyTo=clusterIndex[gate.outputI[n]];
        activeLines.push(applyTo);
        for (var m=0;m<lines.length;m++){
          if (clusterIndex[m]==applyTo){
            lineFill[m]=gate.outputV[n];
          }
        }
      }
    }
  }
}

function setGates(){
  activeGates=[];
  for (var i=0;i<gates.length;i++){
    var gate=gates[i];
    var inps=gates[i].dom.getElementsByClassName("gateinput");
    gate.inputV=[];
    var ignore=false;
    for (var n=0;n<gate.inputC.length;n++){
      if (gate.inputI[n]!=-1){
        var val=lineFill[gate.inputI[n]];
        gate.inputV.push(val);
        if (val!=null){ignore=true;}
      }else{
        gate.inputV.push(null);
      }
    }
    
    for (var n=0;n<gate.inputC.length;n++){
      if (ignore&&gate.inputV[n]==null){gate.inputV[n]=0;}
      inps[n].setAttribute("state",gate.inputV[n]);
    }
    
    //Logic stuff
    var type=gate.dom.getAttribute("type");
    if (type.includes("led")){
      gate.dom.getElementsByClassName("ldiode")[0].setAttribute("state",gate.inputV[0]==0||gate.inputV[0]==null?"off":"on");
    }else if (type=="display"){
      var no=0;
      var pow=gate.inputV.length;
      for (var n=0;n<gate.inputI.length;n++){
        var v=gate.inputV[n];
        if (v==null){v=0;}
        no+=(Math.pow(2,(pow-n-1))*v);
      }
      gate.dom.getElementsByClassName("digit")[0].setAttribute("value",no);
    }else if (type.includes("mux")){
      var start,range;
      if (type=="mux"){
        start=Math.pow(2,Math.floor(Math.log(gate.inputV.length)/Math.log(2)));
        range=gate.inputV.length-start;
      }else{
        start=0;
        range=gate.inputV.length-1;
      }
      var signal=0;
      for (var n=0;n<range;n++){
        signal+=Math.pow(2,range-n-1)*gate.inputV[start+n];
      }
      console.log(signal);
      if (type=="mux"){
        gate.outputV=[gate.inputV[signal]];
        gate.dom.getElementsByClassName("gateoutput")[0].setAttribute("state",gate.inputV[signal]);
        gate.dom.getElementsByClassName("gatepointer")[0].style.top=(15+signal*20)+"px";
      }else{
        var last=gate.inputV.length-1;
        for (var n=0;n<gate.outputV.length;n++){
          gate.outputV[n]=gate.inputV[last]==null?null:0;
          gate.dom.getElementsByClassName("gateoutput")[n].setAttribute("state",gate.outputV[n]);
        }
        gate.outputV[signal]=gate.inputV[last];
        gate.dom.getElementsByClassName("gateoutput")[signal].setAttribute("state",gate.inputV[last]);
        gate.dom.getElementsByClassName("gateoutpointer")[0].style.top=(15+signal*20)+"px";
      }
      for (var v=0;v<gate.inputI.length;v++){
        if (contElem(activeLines,clusterIndex[gate.inputI[v]])){activeGates.push(i); break;}
      }
    }else if (gate.dom.className=="gate"&&ignore){
      var len=gate.inputV.length;
      var processed=type.replace("not ","");
      var tot=0,val;
      for (var n=0;n<len;n++){
        tot+=gate.inputV[n];
      }
      if (processed=="and"){val=tot==len;}
      else if (processed=="or"){val=tot>=1;}
      else if (processed=="xor"){val=tot==1;}
      else if (processed=="not"){val=Boolean(Math.floor(tot-1));}
      if (processed!=type){val=!val;}
      val=val?1:0;
      gate.outputV=[val];
      gate.dom.getElementsByClassName("gateoutput")[0].setAttribute("state",val);
      for (var v=0;v<gate.inputI.length;v++){
        //if (contElem(activeLines,clusterIndex[hover(gate.inputC[v][0],gate.inputC[v][1],-1)])){activeGates.push(i); break;}
        if (contElem(activeLines,clusterIndex[gate.inputI[v]])){activeGates.push(i); break;}
      }
      //activeGates.push(i);
    }
  }
  //console.log(activeGates);
}

function toggleExpando(elem){
  elem=elem.parentElement;
  elem.setAttribute("expanded",elem.getAttribute("expanded")=="true"?false:true);
}

function selectButton(name,id){
  var elems=document.getElementsByClassName(name);
  for (var i=0;i<elems.length;i++){
    if (elems[i].getAttribute("selected")==""){
        elems[i].removeAttribute("selected");
    }
  }
  elems[id].setAttribute("selected","");
}

function setButtons(id,bpress){
  var main=document.getElementById("maincontent");
  if (id==0){
    drawing=false;
    editable=true;
    draggable=false;
    main.className="select";
    if (simulating){toggleSimulation();}
  }else if (id==1){
    drawing=true;
    editable=true;
    draggable=false;
    main.className="draw";
    if (simulating){toggleSimulation();}
  }else{
    drawing=false;
    draggable=true;
    editable=false;
    main.className="move";
  }
  selectButton("actionbutton",id);
}

function toggleSimulation(){
  var elem=document.getElementById("playpause");
  var sidebar=document.getElementById("selection");
  var main=document.getElementById("maincontent");
  if (elem.getAttribute("state")=="off"){
    simulating=true;
    updateBtns();
    editable=false;
    elem.setAttribute("state","on");
    sidebar.style.left="-250px";
    main.setAttribute("simulation",true);
    ctx.clearRect(0,0,window.innerWidth,window.innerHeight);
    simulate();
  }else{
    hideError()
    simulating=false;
    hist[histPointer]=genData();
    updateBtns();
    editable=true;
    elem.setAttribute("state","off");
    sidebar.style.left="0";
    main.setAttribute("simulation",false);
    resetComps();
    draw();
  }
  setTitle();
}

function resetComps(){
  for (var i=0;i<lineFill.length;i++){
    lineFill[i]=null;
  }
  for (var i=0;i<gates.length;i++){
    if (gates[i].dom.className!="input"){
      var gate=gates[i];
      var puts=gate.dom.getElementsByClassName("gateinput");
      for (var n=0;n<gate.inputV.length;n++){
        gate.inputV[n]=null;
        puts[n].setAttribute("state",null);
      }
      puts=gate.dom.getElementsByClassName("gateoutput");
      for (var n=0;n<gate.outputV.length;n++){
        gate.outputV[n]=null;
        puts[n].setAttribute("state",null);
      }
      
      /*if (gate.dom.getAttribute("state")!=undefined){
        gate.dom.setAttribute("state",null);
      }*/
    }
  }
}

function setDir(pos){
  gates[moveElems[0]].dom.getElementsByClassName("gateinput")[0].setAttribute("pos",pos);
  gateUpdate();
}

function setMux(count){
  var me=gates[moveElems[0]].dom;
  var id=me.getAttribute("type")=="mux"?0:1,names=["gateinput","gateoutput"];
  var inps=[[30],[20,40],[10,30,50]];
  var h=20*(count+1);
  me.style.height=h+"px";
  me.style.marginTop=(-h/2)+"px";
  h-=2;
  me.getElementsByTagName("path")[0].setAttribute("d",id==0?"M2 2 L58 10 L58 "+(h-8)+" L2 "+h+" Z":"M2 10 L58 2 L58 "+h+" L2 "+(h-8)+" Z");
  var elems=me.children;
  elems[elems.length-1].style.top="15px";
  var tmp=elems[elems.length-2].outerHTML+""+elems[elems.length-1].outerHTML;
  var inner="";
  for (var i=0;i<count;i++){
    inner+="<div class='"+names[id]+"' state='null' connected='false'></div>";
  }
  var id2=Math.floor(Math.log(count)/Math.log(2))-1;
  for (var i=0;i<inps[id2].length;i++){
    inner+="<div class='gateinput' state='0' connected='false' pos='bottom' style='left:"+inps[id2][i]+"px'></div>"
  }
  inner+="<div class='"+names[Math.abs(id-1)]+"' state='null' connected='false' "+(id==0?"pos='right'":"pos='left'")+"></div>"+tmp;
  me.innerHTML=inner;
  me.setAttribute("pins",count);
}

function setMuxInp(id){
  var inps=gates[moveElems[0]].dom.getElementsByClassName("gateinput");
  for (var i=0;i<inps.length;i++){
    if (inps[i].getAttribute("pos")!=null&&inps[i].getAttribute("pos")!="left"){
      inps[i].setAttribute("pos",id);
    }
  }
}

function keyPress(evt){
  if (document.getElementById("shadow").style.display=="flex"){return;}
  var kk=evt.keyCode;
  //remove elements
  if (kk==8||kk==46){
    for (var i=0;i<gates.length;i++){
      if (gates[i].dom.getAttribute("selected")=="true"){
        gates[i].dom.parentElement.removeChild(gates[i].dom);
        gates.splice(i,1);
        i--;
      }
    }
    var next=selLines.length-1;
    for (var i=lines.length-1;i>=0;i--){
      if (i==selLines[next]){
        lines.splice(i,1);
        next--;
      }
    }
    selLines=[];
    ctx.clearRect(0,0,window.innerWidth,window.innerHeight);
    draw();
    createGroups();
    gateUpdate();
    updateData();
    saveHistory();
  }else if (kk==66){
    setButtons(0);
  }else if (kk==78){
    setButtons(1);
  }else if (kk==77){
    setButtons(2);
  }else if (kk==80){
    toggleSimulation();
  }else if (kk==76){
    genElement(last);
  }else if(kk==89&&evt.ctrlKey||kk==90&&evt.ctrlKey&&evt.shiftKey){
    evt.preventDefault();
    historyForward();
  }else if(kk==90&&evt.ctrlKey){
    evt.preventDefault();
    historyBack();
  }else if(kk==83&&evt.shiftKey&&evt.ctrlKey){
    evt.preventDefault();
    openSaveAs();
  }else if(kk==83&&evt.ctrlKey){
    evt.preventDefault();
    //Just to set next_acton to null
    openPopup(1,null);
    save();
  }else if(kk==69&&evt.ctrlKey){
    evt.preventDefault();
    openExport();
  }
}

function showError(err){
  clearTimeout(hide);
  var elem=document.getElementById("errorinfo");
  elem.style.display="block";
  elem.style.opacity=1;
  document.getElementById("innererror").innerHTML=errCodes[err];
  //setTimeout(function(){div.style.display="none";},4000);
}

function hideError(){
  var elem=document.getElementById("errorinfo");
  elem.style.opacity=0;
  hide=setTimeout(function(){elem.style.display="none"; elem.style.opacity=1;},1000);
}

function changeGate(elem){
  svgGate=elem.selectedIndex==0;
  var gts=document.getElementsByClassName("gate");
  for (var i=0;i<gts.length;i++){
    gts[i].setAttribute("svg_enabled",svgGate);
  }
}

function dhcToDec(dhc){
  var result=0,len=dhc.length;
  for (var i=0;i<len;i++){
    var cc=dhc.charCodeAt(i);
    result+=(cc-(cc<=57?48:(cc<=90?55:61)))*Math.pow(62,len-i-1);
  }
  return result;
}

function decToDhc(dec){
  var result=[],rem;
  while(true){
    rem=dec%62;
    result.splice(0,0,String.fromCharCode(rem+(rem<10?48:rem<36?55:61)));
    if (rem==dec){
      return result.join("");
    }
    dec=Math.floor(dec/62);
  }
}

function genData(){
  //Syntax: https://stuff?cID=02;0fg&coords=fsH78GHhgHNb&lines=H89gHIuw;sdfjhk;weruysk2q&offset=sGHjc5
  var data="cID=";
  for (var i=0;i<gates.length;i++){
    var dom=gates[i].dom;
    var type=getID(dom.getAttribute("type"));
    data+=type;
    if (type[0]=='0'){
      data+=dom.getAttribute("value");
    }else if (type[0]=='1'){
      data+=dom.getElementsByClassName("gateinput").length;
    }else if (type[0]=='2'){
      var pos=["left","top","right","bottom"],tpe=dom.getElementsByClassName("gateinput")[0].getAttribute("pos"),add=0;
      for (var n=0;n<4;n++){
        if (pos[n]==tpe){add=n; break;}
      }
      data+=add;
    }else if (type[0]=='3'){
      var pos=["bottom","top"],inp=dom.getElementsByClassName("gateinput"),outp=dom.getElementsByClassName("gateoutput"),add=0;
      data+=dom.getAttribute("pins");
      var tpe=inp[inp.length-1].getAttribute("pos");
      add=0;
      for (var n=0;n<2;n++){
        if (pos[n]==tpe){add=n; break;}
      }
      data+=add;
    }
    if (i<gates.length-1){data+=':';}
  }
  data+="&coords=";
  for (var i=0;i<gates.length;i++){
    var dom=gates[i].dom;
    data+=decToDhc(Math.floor(parseInt(dom.style.left.replace("px",""))/acc)+1900);
    data+=decToDhc(Math.floor(parseInt(dom.style.top.replace("px",""))/acc)+1900);
  }
  data+="&wires=";
  for (var i=0;i<lines.length;i++){
    for (var n=0;n<lines[i].length;n+=2){
      data+=decToDhc(Math.floor(lines[i][n]/acc)+1900);
      data+=decToDhc(Math.floor(lines[i][n+1]/acc)+1900);
    }
    if (i<lines.length-1){data+=':';}
  }
  data+="&offset=";
  data+=decToDhc(Math.floor(absX/acc)+1900);
  data+=decToDhc(Math.floor(absY/acc)+1900);
  data+=(decToDhc(offsetX)+""+decToDhc(offsetY));
  return data;
}

function parseData(dataStr){
  var read=false,len=0,tmpStr="";
  var data=[];
  for (var i=0;i<dataStr.length;i++){
    var ca=dataStr.charAt(i);
    if (ca=='='){
      read=true;
      data.push([]);
    }else if(read){
      var iil=i==dataStr.length-1;
      if (ca==':'||ca=='&'||iil){
        data[len].push(tmpStr+(iil?ca:''));
        tmpStr="";
      }else{
        tmpStr+=ca;
      }
      if (ca=='&'){
        len++;
        read=false;
      }
    }
  }
  if (data.length==0){return;}
  var xy=data[3][0];
  offsetX=dhcToDec(xy[4]);
  offsetY=dhcToDec(xy[5]);
  absX=(dhcToDec(xy[0]+xy[1])-1900)*acc+offsetX;
  absY=(dhcToDec(xy[2]+xy[3])-1900)*acc+offsetY;
  var main=document.getElementById("maincontent");
  main.innerHTML="";
  gates=[];
  console.log(data);
  if (dataStr.includes(blank)){
    moveElems=[];
    lines=[];
    pressed=false;
    createGroups();
    gateUpdate();
    updateData();
    return;
  }
  
  for (var i=0;i<data[0].length;i++){
    genElement(types[parseInt(data[0][i][0])].members[parseInt(data[0][i][1])].name);
    moveElems=domToNum(main.lastChild);
    var me=gates[moveElems[0]].dom;
    me.style.zIndex=0;
    var dc=data[0][i];
    if (dc[0]=='0'){
      if (dc[1]==0){
        me.setAttribute("value",dc[2]);
        var outs=me.getElementsByClassName("gateoutput");
        for (var n=0;n<outs.length;n++){
          outs[n].setAttribute("state",dc[2]);
        }
      }
    }else if (dc[0]=='1'){
      relayInput(me,parseInt(dc[2]));
    }else if (dc[0]=='2'){
      if (dc[2]!='0'){
        var dirs=["top","right","bottom"];
        setDir(dirs[parseInt(dc[2])-1]);
      }
    }else if (dc[0]=='3'){
      if (dc[2]!='2'){
        setMux(parseInt(dc[2]));
      }
      if (dc[3]!='0'){
        setMuxInp("top");
      }
    }
  }
  moveElems=[];
  var children=main.children;
  for (var i=0;i<children.length;i++){
    var x=(dhcToDec(data[1][0][i*4]+data[1][0][i*4+1])-1900)*acc+offsetX;
    var y=(dhcToDec(data[1][0][i*4+2]+data[1][0][i*4+3])-1900)*acc+offsetY;
    gates[i].coords=[x,y];
    children[i].style.left=x+"px";
    children[i].style.top=y+"px";
  }
  lines=[];
  clusterIndex=[];
  if (data[2][0]!=""){
    for (var i=0;i<data[2].length;i++){
      lines.push([]);
      for (var n=0;n<data[2][i].length;n+=4){
        lines[i].push((dhcToDec(data[2][i][n]+data[2][i][n+1])-1900)*acc+offsetX);
        lines[i].push((dhcToDec(data[2][i][n+2]+data[2][i][n+3])-1900)*acc+offsetY);
      }
    }
  }
  pressed=false;
  createGroups();
  gateUpdate();
  updateData();
}

function getID(type){
  for (var i=0;i<types.length;i++){
    for (var n=0;n<types[i].members.length;n++){
      if (types[i].members[n].name==type){
        return i+""+n;
      }
    }
  }
  return null;
}

function openExport(){
  document.getElementById("title_export").innerHTML="Share switchboard";
  document.getElementById("shadow").style.display="flex";
  document.getElementsByClassName("popup")[0].style.display="flex";
  var link="https://furyaxlelectronicgates.blogspot.com"+genData();
  document.getElementById("exportfield").value=link;
  document.getElementById("exportfield").select();
}

function copyLink(){
  var field=document.getElementById("exportfield");
  field.select();
  var succ=document.execCommand("copy");
  field.blur();
  field.style.animation=(succ?"succ":"fail")+" 1s 1";
  setTimeout(function(){
    field.style.animation="";
  },1000);
  document.getElementById("title_export").innerHTML="Share switchboard - "+(succ?"Success!":"Failed");
}

function openPopup(id,next){
  closePopups();
  document.getElementById("shadow").style.display="flex";
  var popup=document.getElementsByClassName("popup")[id]
  popup.style.display="flex";
  popup.setAttribute("next_action",next);
  clearInput(popup);
}

function createNew(){
  if (!shouldSave()){
    setNew();
  }else{
    openPopup(1,"new");
    document.getElementById("prompttext").innerHTML="Save "+(title==null?"untitled":title)+"?";
  }
}

function setNew(){
  gates=[];
  lines=[];
  document.getElementById("maincontent").innerHTML="";
  title=null;
  prevSave="";
  createGroups();
  updateData();
  draw();
  hist=[];
  absX=0;
  absY=0;
  offsetX=0;
  offsetY=0;
  setCanvas();
  histPointer=-1;
  saveHistory();
  setTitle();
}

function save(){
  var next=document.getElementsByClassName("popup")[1].getAttribute("next_action");
  if (title!=null){
    localStorage.setItem(title,hist[histPointer]);
    if (!contElem(filenames,title)){
      filenames.push(title);
      localStorage.setItem("filenames",filenames);
    }
    setTitle();
    prevSave=hist[histPointer];
  }else{
    closePopups();
    openSaveAs(next);
    return;
  }
  execNext(next);
  closePopups();
  updateBtns();
}

function finalSave(elem){
  var field=elem.parentElement.getElementsByClassName("searchfield")[0];
  if (field.value!=""){
    title=field.value;
    save();
  }
}

function noSave(){
  var next=document.getElementsByClassName("popup")[1].getAttribute("next_action");
  execNext(next);
  closePopups();
}

function openSaveAs(next){
  openPopup(2,next);
}

function openOpen(){
  openPopup(3,null);
}

function finalOpen(){
  var field=document.getElementById("open").getElementsByClassName("searchfield")[0];
  if (contElem(filenames,field.value)){
    if (shouldSave()){
      openPopup(1,"open");
      document.getElementById("prompttext").innerHTML="Save "+(title==null?"untitled":title)+"?";
    }else{
      open(field.value);
    }
  }
}

function open(name){
  parseData(localStorage.getItem(name));
  hist=[];
  histPointer=-1;
  saveHistory();
  prevSave=hist[0];
  title=name;
  setTitle();
  closePopups();
  setCanvas();
  updateBtns();
}


function execNext(key){
  if (key=="new"){
    setNew();
  }else if (key=="open"){
    var field=document.getElementById("open").getElementsByClassName("searchfield")[0];
    open(field.value);
  }
}

function closePopups(){
  var popups=document.getElementsByClassName("popup");
  for (var i=0;i<popups.length;i++){
    popups[i].style.display="none";
  }
  document.getElementById("shadow").style.display="none";
}

function clearInput(elem){
  var fields=elem.getElementsByClassName("searchfield");
  if (fields.length>0){
    fields[0].value="";
    fields[0].focus();
  }
}

function setTitle(){
  var afterStr=" - boolflo";
  if (simulating){
    afterStr=" [running]";
  }else if (shouldSave()&&title!=null){
    afterStr="* - boolflo";
  }
  document.getElementById("doctitle").innerHTML=(title==null?"untitled switchboard":title);
  document.getElementsByTagName("title")[0].innerHTML=(title==null?"untitled"+afterStr:title+afterStr);
}

function shouldSave(){
  return (gates.length!=0||lines.length!=0)&&prevSave!=hist[histPointer];
}

window.onbeforeunload = function(){
  return (!shouldSave()?undefined:true);
};

function domToNum(dom){
  for (var i=0;i<gates.length;i++){
    if (dom==gates[i].dom){return [i];}
  }
  return [];
}

init();
setCanvas();