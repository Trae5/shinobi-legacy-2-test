/* SL perf: auto adaptive resolution scaling (FPS-driven) for auto graphics quality.
   Loaded after game.js. Only acts when Settings > Graphics quality is "auto".
   Lowers resScale when fps sags, raises it back when there is headroom. */
(function(){
  if(window.__slPerf)return;
  var MIN=0.5,STEP=0.1,LOW=38,HIGH=57,WIN=2000,COOL=4000;
  var st={fps:0,scale:1,base:0,ready:false,coolUntil:0,good:0};
  window.__slPerf=st;
  function demo(){return /[?&]perfdemo=1/.test(location.search)}
  function boot(){
    var SL=window.SL;
    if(!SL||!SL.renderer){setTimeout(boot,250);return}
    st.ready=true;st.base=SL.renderer.getPixelRatio()||1;
    var last=performance.now(),n=0;
    function tick(ts){
      n++;var dt=ts-last;
      if(dt>=WIN){
        var fps=n*1000/dt;st.fps=Math.round(fps);last=ts;n=0;
        if(demo())fps=20;
        var SL=window.SL,q=SL&&SL.settings&&SL.settings.quality;
        if(q==="auto"&&ts>=st.coolUntil){
          if(fps<LOW){var ns=Math.max(MIN,Math.round((st.scale-STEP)*10)/10);
            if(ns!==st.scale){st.scale=ns;setRatio();st.coolUntil=ts+COOL;console.log("[perf] fps "+st.fps+" -> resScale "+st.scale)}else st.coolUntil=ts+COOL;
          }else if(fps>HIGH){st.good++;if(st.good>=2){var up=Math.min(1,Math.round((st.scale+STEP)*10)/10);st.good=0;
            if(up!==st.scale){st.scale=up;setRatio();st.coolUntil=ts+COOL;console.log("[perf] fps "+st.fps+" -> resScale "+st.scale)}}}
          else st.good=0;
        }
      }
      requestAnimationFrame(tick);
    }
    function setRatio(){
      var SL=window.SL,R=SL&&SL.renderer;if(!R)return;
      try{SL.settings.resScale=st.scale;
        R.setPixelRatio(Math.max(0.25,st.base*st.scale));
        R.setSize(innerWidth,innerHeight,false);}catch(e){}
    }
    st.apply=setRatio;
    requestAnimationFrame(tick);
  }
  boot();
})();
