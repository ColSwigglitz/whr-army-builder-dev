// Mighty Empires tile tray scrolling fix (Dev only)
(() => {
  const id='me3TrayScrollFix';
  if(document.getElementById(id)) return;
  const s=document.createElement('style');
  s.id=id;
  s.textContent=`
    .me3-tray{min-height:0;overflow-y:auto!important;overscroll-behavior:contain;scrollbar-gutter:stable;}
    .me3-assets{min-height:0;}
    @media(max-width:850px){
      .me3-tray{max-height:300px!important;overflow-y:auto!important;overflow-x:hidden!important;-webkit-overflow-scrolling:touch;}
      .me3-tabs{flex:0 0 auto;}
      .me3-assets{display:grid!important;grid-template-columns:repeat(3,minmax(86px,1fr))!important;overflow:visible!important;}
    }
  `;
  document.head.appendChild(s);
})();
