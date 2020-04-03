/* Script to easily create loops (to simulate gif user experience) of satellite images from NESDIS star page
 * To be used in conjunction with satAwesome.css
 * Radar functionality added (just throws in ridge gifs)
 * Updated: Feb 26 2019 to add GOES-17 
 * Author: Michelle McAuley and Shad Keene
*/

/* Each loop is an instance of the MyLoopObj class. */

/* --- MyLoopObj prototype functions --- */ 

/* create caption elm, with time and name fields */
MyLoopObj.prototype.makeCaption = function(){
  var caption = document.createElement("figcaption");
  var timeSpan = document.createElement("span");
  timeSpan.className += "time";
  var nameSpan = document.createElement("span");
  nameSpan.className += "name";
  caption.appendChild(timeSpan);
  caption.appendChild(nameSpan); 
  caption.timeSpan = timeSpan;
  caption.nameSpan = nameSpan;
  return caption;
};

/* create img element where image will live once imported
 * attach caption to that elm
 */
MyLoopObj.prototype.makeImgPlace = function(destContainer,caption){
  var imgSpot = document.createElement("img");
  var destContainer = document.getElementById(destContainer);
  destContainer.appendChild(caption);
  destContainer.appendChild(imgSpot);
  return imgSpot;
};

/* parse json files, load all the images, then animate */
MyLoopObj.prototype.grabImgs = function(){
 var self = this; //bind object to self so request works
 var request = new XMLHttpRequest();
 request.open('GET',self.catalogURL, true);
 request.addEventListener('load',function(){
 //if (request.status >= 200 && request.status < 400){
 if (request.status == 200){
   var json = JSON.parse(request.responseText);
   var res = self.resolution;
   self.captionSpot.nameSpan.textContent = json.meta.description;
   (self.destination).src = "https://www.wrh.noaa.gov/mfr/dot/satAwesome/loading_spinner.gif";
   console.log("resolution of "+json.meta.description+" is "+self.resolution);
   var imgsJson = (json.images[res]).slice(-1*self.length); //array on json page is in order from least to most recent, so grab last elms
   imgsJson = imgsJson.reverse();
   var k=0;
   for (var i=0; i<self.length; i++){
    self.images[i] = new Image();
    self.images[i].src = self.imgURL+imgsJson[i];
    self.dates[i] = timestamp((imgsJson[i].split("_"))[0]);
    self.images[i].addEventListener('load',function(){ //once all images have loaded, animate
     k++;
     if(k==self.length){
      console.log("length of "+json.meta.description+" is "+self.length);
      self.animateMe();
     }
    }); 
    self.images[i].addEventListener('error',function(e){
     console.log("error in line 60...of type "+e.type+" detail: "+e.detail+" cancelable: "+e.cancelable);
     i-=1;
     self.length--; //lower length so animate will work
    });
   } 
  }
  else
   console.log("got an error");
 });
 request.onerror = function(){
  console.log("connection error");
 };
 request.send();
}; 

/* change image to what corresponds to given index in loop */
MyLoopObj.prototype.show_image = function(num) {
  (this.destination).src = this.images[num].src;
  this.currImg = num;
  (this.captionSpot.timeSpan).textContent = this.dates[num];
};

/* animate function */
MyLoopObj.prototype.animateMe = function(){
  var self = this; //save context for setTimeout
  this.nextImg = this.currImg-1;
  if (this.nextImg < 0){this.nextImg=this.length-1;}
  this.show_image(this.nextImg);
  if (this.nextImg == 0)
    self.timeId = window.setTimeout(function(){self.animateMe()}, 1000);
  else
    self.timeId = window.setTimeout(function(){self.animateMe()}, 500);
};

/* MyLoopObj constructor */
function MyLoopObj(destContainer, goesSat, channel, sector, res, numFrames, autoShrink){
  this.images = new Array(); this.dates = new Array();
  document.getElementById(destContainer).className += "satDisplay";
  this.captionSpot = this.makeCaption();
  this.destination = this.makeImgPlace(destContainer,this.captionSpot);
  this.delay = 500; 
  this.currImg = 0;this.nextImg = 1;
  this.length = numFrames; this.sector = sector.toUpperCase(); 
  if (this.sector == "CONUS" || this.sector == "FD"){
   this.catalogURL = 'https://cdn.star.nesdis.noaa.gov/'+goesSat+'/catalogs/'+goesSat+'/'+this.sector+'_'+channel+'_catalog.json';
   this.imgURL = 'https://cdn.star.nesdis.noaa.gov/'+goesSat+'/ABI/'+this.sector+'/'+channel+'/';
  }
  else{
   this.sector = sector.toLowerCase();
   this.catalogURL = 'https://cdn.star.nesdis.noaa.gov/'+goesSat+'/catalogs/'+goesSat+'/SECTOR_'+channel+'_'+this.sector+'_catalog.json';
   this.imgURL = 'https://cdn.star.nesdis.noaa.gov/'+goesSat+'/ABI/SECTOR/'+this.sector+'/'+channel+'/';
  }
  this.resolution = setRes(res,autoShrink,this.sector);

  this.stop = function(){
    var self = this;
    window.clearTimeout(self.timeId);
  };
}

/* helper functions */

/* return formatted timestamp */
function timestamp(ordinalDate){
  var year = ordinalDate.substring(0,4);
  var day = ordinalDate.substring(4,7);
  var hour = ordinalDate.substring(7,11);
  var date = new Date(year, 0, day);
  var timestamp = date.toLocaleDateString();
  return timestamp+" "+hour+"Z";
}

/* pass in array of MyLoopObj */
function preLoad(objList){
  console.log("loading in new images");
  for(var i=0;i<objList.length;i++){
    objList[i].stop();
    objList[i].grabImgs();
  }
}

/*change resolution to smaller if smaller screen detected and
 * autoShrink set to true
*/

function setRes(resolution,autoShrink,sector){
 var res = resolution.replace('X','x'); //case sensitive
 if (autoShrink == false || (typeof autoShrink == "string" && autoShrink.toLowerCase() == "false"))
  return res;

 var height=window.innerHeight;
 var width=window.innerWidth;
 var smallEnough=false;
 var outOfOptions=false;
 while(!smallEnough && !outOfOptions){
  var dimensions = res.split("x");
  var imgWidth = dimensions[0];
  var imgHeight = dimensions[1];
  if (imgWidth > width || imgHeight > height){
   if (["pnw","nr","umv","cgl","ne","psw","sr","sp","smv","se","pr","hi"].indexOf(sector)!=-1){
    switch(res){
     case "2400x2400":
      res = "1200x1200";
      break;
     case "1200x1200":
      res = "600x600";
      break;
     default:
      res ="300x300"; //can't go smaller than 300x300
      outOfOptions=true;
    }
   }
   else if (["eus","gm"].indexOf(sector)!=-1){
    switch(res){
     case "2001x2000":
      res = "1000x1000";
      break;
     case "1000x1000":
      res = "500x500";
      break;
     default:
      res = "250x250";
      outOfOptions=true;
    }
   }
   else if (sector == "car" || sector == "ak" || sector == "wus"){
    switch(res){
     case "4000x4000":
      res = "2000x2000";
      break;
     case "2000x2000":
      res = "1000x1000";
      break;
     case "1000x1000":
      res = "500x500";
      break;
     default:
      res = "250x250";
      outOfOptions=true;
    }
   }
   else if (sector == "taw" || sector == "tpw"){
    switch(res){
     case "7200x4320":
      res = "3600x2160";
      break;
     case "3600x2160":
      res = "1800x1080";
      break;
     case "1800x1080":
      res = "900x540";
      break;
     default:
      res = "450x270";
      outOfOptions=true;
    }
   }
   else if (sector == "CONUS"){
    switch(res){
     case "5000x3000":
      res = "2500x1500";
      break;
     case "2500x1500":
      res = "1250x750";
      break;
     case "1250x750":
      res = "625x375";
      break;
     default:
      res = "416x250";
      outOfOptions=true;
    }
   }
   else if (sector == "FD"){
    switch(res){
     case "10848x10848":
      res = "5424x5424";
      break;
     case "5424x5424":
      res = "1808x1808";
      break;
     case "1808x1808":
      res = "678x678";
      break;
     default:
      res = "339x339";
      outOfOptions=true;
    }
   }
  }
  else
   smallEnough = true;
 }
 return res;
}

/* for loading radar gifs */
function loadRadar(objList){
 var prodKey = {NCR:"Composite Reflectivity",N0R:"Base Reflectivity",N0S:"Storm Relative Velocity",N0V:"Base Velocity",N1P:"1 Hour Rainfall Total",NTP:"Storm Total Rainfall"};
 console.log("loading first radar");
 for(var i=0;i<objList.length;i++){
  var imgSpot = document.createElement("img");
  var destContainer = document.getElementById(objList[i].figId);
  destContainer.className += "radarDisplay";destContainer.appendChild(imgSpot);
  objList[i].imgSpot = imgSpot;

  if (typeof objList[i].showCaption === 'undefined')
   objList[i].showCaption = true;
  if (typeof objList[i].showProduct === 'undefined')
   objList[i].showProduct = true;

  /* make caption unless specified not to*/
  if (objList[i].showCaption){
   var caption = document.createElement("figcaption");
   var citySpan = document.createElement("span"); citySpan.className += "city";
   citySpan.textContent = objList[i].name;
   var prodSpan = document.createElement("span"); prodSpan.className += "product";
   if (objList[i].showProduct)
    prodSpan.textContent = prodKey[objList[i].product] || "Composite Reflectivity Mosaic";
   caption.appendChild(citySpan); caption.appendChild(prodSpan); 
   destContainer.appendChild(caption);
  }

  if ((objList[i].radarId).length != 3){ /* not a 3 letter code, thus mosaic */
   if (objList[i].radarId == "alaska" || objList[i].radarId == "hawaii")
    objList[i].url = "https://radar.weather.gov/ridge/Conus/Loop/"+objList[i].radarId+"Loop.gif";
   else
    objList[i].url = "https://radar.weather.gov/ridge/Conus/Loop/"+objList[i].radarId+"_loop.gif";
  }
  else
   objList[i].url = "https://radar.weather.gov/lite/"+objList[i].product+"/"+(objList[i].radarId).toUpperCase()+"_loop.gif";
  (objList[i].imgSpot).src = objList[i].url;
 }
}

function reloadRadar(objList){
 for(var i=0;i<objList.length;i++)
  (objList[i].imgSpot).src = objList[i].url +"?t="+ new Date().getTime();
}



/** END of function definitions **/

/* create satellite objects 
* must have an array named bandsAwesome defined 
* and load radar if radarSites array defined
*/

document.addEventListener('DOMContentLoaded',function(){
 if (typeof bandsAwesome !== 'undefined'){
  var bandsObjs = [];
  for(var i=0;i<bandsAwesome.length;i++){
   var newObj = new MyLoopObj(bandsAwesome[i].figId, bandsAwesome[i].goesSat, bandsAwesome[i].band, bandsAwesome[i].sector, bandsAwesome[i].size, bandsAwesome[i].frames, bandsAwesome[i].autoShrink);
   bandsObjs.push(newObj);
  }

  /* load in images */
  preLoad(bandsObjs);
  setInterval(function() {preLoad(bandsObjs)}, 200000); //refresh every 200 seconds
 }
 else
  console.log("must define bandsAwesome var to get satellite loops");

 /* load radar */
 if ( typeof radarSites !== 'undefined'){
  loadRadar(radarSites);
  setInterval(function() {reloadRadar(radarSites)}, 200000); //refresh every 200 seconds
 }
 else
  console.log("must define radarSites var to get radar");
});
