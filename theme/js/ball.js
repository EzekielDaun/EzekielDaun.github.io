$( document ).ready( function() {
  var entries=[];
  var target=document.getElementById('ball');
  var articles=target.getElementsByClassName('ball-element');
  for (var i=0; i<articles.length; i++) {
    var article= articles[i];
    entries.push({label:article.title,url:article.href,target:'_top'});
  }

  var settings = {

      entries: entries,
      width: '480px',
      height: '50%',
      radius: '65%',
      radiusMin: 75,
      bgDraw: true,
      bgColor: '#000',
      opacityOver: 1.00,
      opacityOut: 0.05,
      opacitySpeed: 6,
      fov: 800,
      speed: 0.15,
      fontFamily: 'Oswald, Arial, sans-serif',
      fontSize: '15',
      fontColor: 'currentColor',
      fontWeight: 'normal',//bold
      fontStyle: 'normal',//italic
      fontStretch: 'normal',//wider, narrower, ultra-condensed, extra-condensed, condensed, semi-condensed, semi-expanded, expanded, extra-expanded, ultra-expanded
      fontToUpperCase: true,
      tooltipFontFamily: 'Oswald, Arial, sans-serif',
      tooltipFontSize: '11',
      tooltipFontColor: '#fff',
      tooltipFontWeight: 'normal',//bold
      tooltipFontStyle: 'normal',//italic
      tooltipFontStretch: 'normal',//wider, narrower, ultra-condensed, extra-condensed, condensed, semi-condensed, semi-expanded, expanded, extra-expanded, ultra-expanded
      tooltipFontToUpperCase: false,
      tooltipTextAnchor: 'left',
      tooltipDiffX: 0,
      tooltipDiffY: 10

  };

  //var svg3DTagCloud = new SVG3DTagCloud( document.getElementById( 'holder'  ), settings );
  $( '#ball' ).svg3DTagCloud( settings );

} );