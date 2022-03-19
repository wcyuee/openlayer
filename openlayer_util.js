 import "ol/ol.css";
 import { Map, View, Overlay } from "ol";
 import TileGrid from 'ol/tilegrid/TileGrid';
 import {boundingExtent, getCenter as olGetCenter} from 'ol/extent';
 import WMTSTileGrid from 'ol/tilegrid/WMTS';
 import * as olControl from 'ol/control';
 import { get as getProjection, transform, fromLonLat, Projection } from 'ol/proj';
 import { ImageArcGISRest, Vector as VectorSource, XYZ, ImageStatic, WMTS as WMTSSource } from 'ol/source';
 import { Image as ImageLayer, Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
 import GeoJSON from 'ol/format/GeoJSON'
 import * as olRender from 'ol/render';
 import WKT from 'ol/format/WKT'
 import { Style as olStyle, Stroke as olStroke, Circle as olCircle, Fill as olFill, Icon as olIcon, RegularShape as olRegularShape } from 'ol/style'
 import Feature from "ol/Feature"
 import { Point, LineString } from 'ol/geom'
 import { defaults as defaultControls, OverviewMap, FullScreen, ScaleLine, ZoomSlider, MousePosition, ZoomToExtent } from 'ol/control'
 
 
 
//  import zwtpPNG from "../assets/img/dfzy/zwtp.png";
 
 //#region 全局变量
 // 地图投影
 const PROJECTION = getProjection('EPSG:4326');
 var turfFormat = new GeoJSON();
 var overlay = null;
 //点常量样式
 var DOTSTYLE = new olStyle({
     image: new olRegularShape({
         stroke: new olStroke({
             color: 'red',
             width: 6.0
         }),
         radius: 5,
         radius2: 2,
         points: 5
     })
 });
 //#endregion
 
 //#region 底图
 /**
  * wmts服务()
  * @param {*} Id 
  * @param {*} options 
  * @returns 
  */
 function initWMTSMap(Id, options = {}) {
     const baseUrl = 'api_wmts/geoserver/gwc/service/wmts';
     var resolutions = [0.3515624987403729, 0.17578124937018644, 0.08789062468509322, 0.04394531115281611];
     //缺省参数
     // options.extent = options.extent || [-180, -90, 180, 90];
     options.level = options.level || 0;
     options.center = options.center || [120, 30];
     var baseParams = ['VERSION', 'LAYER', 'STYLE', 'TILEMATRIX', 'TILEMATRIXSET', 'SERVICE', 'FORMAT'];
     var params = {
         'VERSION': '1.0.0',
         'LAYER': 'test',
         'STYLE': '',
         'TILEMATRIX': ['EPSG:4326_test:0', 'EPSG:4326_test:1', 'EPSG:4326_test:2', 'EPSG:4326_test:3'],
         'TILEMATRIXSET': 'EPSG:4326_test',
         'SERVICE': 'WMTS',
         'FORMAT': 'image/jpeg'
     };
     var url = baseUrl + '?';
     for (var key in params) {
         if (baseParams.indexOf(key.toUpperCase()) < 0) {
             url = url + key + '=' + params[key] + '&';
         }
     }
     url = url.slice(0, -1);
     var projection1 = new Projection({
         code: 'EPSG:4326',
         units: '',
         axisOrientation: 'neu'
     });
     //源
     var source = new WMTSSource({
         url: url,
         layer: params['LAYER'],
         matrixSet: params['TILEMATRIXSET'],
         format: params['FORMAT'],
         projection: projection1,
         tileGrid: new WMTSTileGrid({
             tileSize: [256, 256],
             extent: [-400.0, -139.99999806521294, 229.99999774274818, 399.9999999999998],
             origin: [-400.0, 399.9999999999998],
             resolutions: resolutions,
             matrixIds: params['TILEMATRIX']
         }),
         style: params['STYLE'],
         wrapX: true
     });
     //图层
     var layer = new TileLayer({
         source: source
     });
     // 定义地图
     let map = new Map({
         // controls: ol.control.defaults({attribution: false, zoom: false, rotate: false}),//隐藏部件
         target: Id,
         layers: [layer],
         view: new View({
             center: options.center,
             resolutions: resolutions,
             zoom: options.level,
             projection: projection1,
             extent: [-400.0, -139.99999806521294, 229.99999774274818, 399.9999999999998]  //视图可达范围
         }),
         controls: defaultControls().extend([
             new ZoomSlider(),// 往地图增加滑块缩放控件
             new FullScreen({ tipLabel: '全屏' }),// 全屏控件
             new ScaleLine(),//比例尺
         ])
     });
     listenPostRender(layer, map);
     return map;
 }
 
 /**
  * arcgis tilelayer图层
  * @param {*} Id dom元素的id
  * @param {*} options 
  * @returns 
  */
 function initTileMap(Id, options = {}) {
     //缺省参数
     options.extent = options.extent || [-180, -90, 180, 90];
     options.level = options.level || 0;
     options.center = options.center || [120, 30];
     //定义原点和分辨率，可在rest缓存服务中找到
     const origin = [-400.0, 399.9999999999998];
     const resolutions = [
         0.3515624987403729,
         0.17578124937018644,
         0.08789062468509322,
         0.04394531115281611
     ];
    
     const url = 'api_map/arcgis/rest/services/WorldYX/MapServer/tile/{z}/{y}/{x}'
     // const url = 'api_map/arcgis/rest/services/WorldBlue/MapServer/tile/{z}/{y}/{x}'
     // 定义瓦片
     return new Map({
         // controls: ol.control.defaults({attribution: false, zoom: false, rotate: false}),//隐藏部件
         target: Id,
         layers: [
             // 瓦片图层
             new TileLayer({
                 preload: 1,
                 //单个底图加载切片的范围
                 // extent: options.extent,
                 source: new XYZ({
                     // 定义瓦片
                     tileGrid: new TileGrid({
                         tileSize: 256,
                         origin: origin,
                         // extent: fullExtent,
                         resolutions: resolutions
                     }),
                     // 坐标
                     projection: PROJECTION,
                     url: url,
                 })
             })
         ],
         view: new View({
             center: options.center,
             resolutions: resolutions,
             // 注意：此处指定缩放级别不能通过zoom来指定，指定了也无效，必须通过resolution来指定
             // 官方API说明：
             // Resolutions to determine the resolution constraint.
             // If set the maxResolution, minResolution, minZoom, maxZoom, and zoomFactor options are ignored.
             resolution: resolutions[options.level],
 
             // zoom: 4,
             // minZoom:1,
             // maxZoom: 20,
             projection: PROJECTION,
             extent: options.extent  //视图可达范围
         }),
     });
 }
 
 /**
  * arcgis image图层
  * @param {*} Id dom元素的id
  * @param {*} options 
  */
 function initImageMap(Id, options = {}) {
     //缺省参数
     options.extent = options.extent || [-180, -90, 180, 90];
     options.level = options.level || 4;
     options.center = options.center || [120, 27];
 
     const url = 'api_map/arcgis/rest/services/World_YX/MapServer'
     let layer = new ImageLayer({
         preload: 1,
         extent: options.extent,
         source: new ImageArcGISRest({
             ratio: 1,
             params: {},
             url: url
         })
     });
 
     let map = new Map({
         layers: [
             layer
         ],
         target: Id,
         view: new View({
             extent: options.extent,
             center: options.center,
             zoom: options.level,
             projection: PROJECTION,
         }),
         controls: defaultControls().extend([
             new ZoomSlider(),// 往地图增加滑块缩放控件
             new FullScreen({ tipLabel: '全屏' }),// 全屏控件
             new ScaleLine(),//比例尺
             // new ZoomToExtent(),//E标识，恢复到四至
             // new MousePosition(),// 坐标拾取控件
             // new OverviewMap({collapsed: false})// 鹰眼控件
         ])
     });
     listenPostRender(layer, map);
     // arrow(layer, map);
     // showLineChunk(map);
     return map;
 }
 
 
 /**
  * 天地图
  * @param {*} Id 
  * @param {*} options 
  * @returns 
  */
 function initTDTMap(Id, options = {}) {
     //天地图影响图层
     const tian_di_tu_satellite_layer = new TileLayer({
         title: "天地图卫星影像",
         source: new XYZ({
             url: "http://t4.tianditu.com/DataServer?T=img_w&x={x}&y={y}&l={z}&tk=xx"
         })
     });
     const tian_di_tu_road_layer = new TileLayer({
         title: "天地图路网",
         source: new XYZ({
             url: "http://t4.tianditu.com/DataServer?T=vec_w&x={x}&y={y}&l={z}&tk=xx"
         })
     });
     const tian_di_tu_annotation = new TileLayer({
         title: "天地图文字标注",
         source: new XYZ({
             url: 'http://t4.tianditu.com/DataServer?T=cva_w&x={x}&y={y}&l={z}&tk=xx'
         })
     });
     //缺省参数
     options.level = options.level || 0;
     options.center = options.center || [120, 27];
     let map = new Map({
         controls: olControl.defaults({ attribution: false, zoom: false, rotate: false }),//隐藏部件
         target: Id,
         layers: [
             // 瓦片图层
            //  tian_di_tu_satellite_layer,
             tian_di_tu_road_layer,
             tian_di_tu_annotation,
         ],
         view: new View({
             center: options.center,
             // resolution: resolutions[options.level],
             projection: PROJECTION,
             zoom: options.level,
         }),
         controls: defaultControls().extend([
             new ZoomSlider(),// 往地图增加滑块缩放控件
             new FullScreen({ tipLabel: '全屏' }),// 全屏控件
             new ScaleLine(),//比例尺
             // new ZoomToExtent(),//E标识，恢复到四至
             // new MousePosition(),// 坐标拾取控件
             // new OverviewMap({collapsed: false})// 鹰眼控件
         ])
     });
 
     return map;
 }
 //#endregion
 
 //#region 浮动层
 function getOverlay(titleStr, bodyStr) {
     if (!document.getElementById("popup")) {
         let dom_str = `<div id="popup" class="ol-popup">
                             <a id="popup-closer" class="ol-popup-closer"></a>
                             <div id="popup-title" class="popup-title">${titleStr}</div>
                             <div id="popup-content" class="popup-content"></div>
                        </div>`;
         let popup_parent = document.createElement("div");
         popup_parent.innerHTML = dom_str;
         let popup = popup_parent.firstElementChild;
         let popup_close = popup.firstElementChild;
         popup_close.addEventListener("click", function () {
             overlay.setPosition(undefined);
         })
         let popup_content = popup.lastElementChild;
         popup_content.innerHTML = bodyStr;
         overlay = new Overlay({
             element: popup,
             // autoPan: true,
             // autoPanAnimation: {
             //     duration: 250   //当Popup超出地图边界时，为了Popup全部可见，地图移动的速度.
             // }
         });
     } else {
         document.getElementById("popup-title").innerHTML = titleStr;
         document.getElementById("popup").lastElementChild.innerHTML = bodyStr;
     }
     return overlay;
 }
 //#endregion
 
 //#region 创建图层
 function createVectorLayer(options = {}) {
     let layer = new VectorLayer({
         source: new VectorSource({
             features: []
         }),
     });
     layer.setProperties(options);
     return layer;
 }
 //#endregion
 
 //#region 创建要素
 function createFeature(cordination, properties, iconStyleOption) {
     let feature = new Feature({
         geometry: new Point(cordination)
     });
     feature.setProperties(properties);
     if (iconStyleOption.src) {
         feature.setStyle(createIconStyle(iconStyleOption));
     } else {
         feature.setStyle(dotStyle);
     }
     return feature;
 }
 
 function createPolygonFeature(wkt, properties) {
     let feature = new WKT().readFeature(wkt);
     feature.setProperties(properties);
     feature.setStyle(styleFunction);
     return feature;
 }
 //#endregion
 
 //#region 样式
 //图标样式
 function createIconStyle(option){
     //图标放大或缩小比例
     option.scale = option.scale || 0.1;
     //图标锚点位置
     // iconStyleOption.anchor = iconStyleOption.anchor || [0.5, 0.5];
     //方位角
     option.rotation = option.rotation || 0;
     //图标图标地址，webpack中需要import引用
    //  option.src = option.src || zwtpPNG;
     return new olStyle({
         image: new olIcon(option)
     });
 }
 //样式函数
 function styleFunction(feature){
     var styles = [];
     styles.push(new olStyle({
         stroke: new olStroke({
             width: 7,
             color: 'grey',
             lineDash: [1, 2, 3, 5, 6]
         })
     }));
 
     let dotStyle = createIconStyle({src: feature.get("src"), scale: 0.2});
     dotStyle.setGeometry(new Point(getCenter(feature.getGeometry())));
     styles.push(dotStyle);
     return styles;
 }
 //#endregion
 
 //#region 工具方法
 function getCenter(geometry) {
     var extent = boundingExtent(geometry.getCoordinates()[0][0]); //获取一个坐标数组的边界，格式为[minx,miny,maxx,maxy]
     return olGetCenter(extent);   //获取边界区域的中心位置
 }
 //#endregion
 
 export { initWMTSMap, initTDTMap, initTileMap, initImageMap, createVectorLayer, getOverlay, createFeature, createPolygonFeature, getCenter}
 