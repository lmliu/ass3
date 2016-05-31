/**
 * OnReady
 */

(function($, d3) {

var parentWidth = $('#map').width(),
    parentHeight = window.innerHeight;

var margin = 50,
    width = parentWidth - (2 * margin),
    height = parentHeight - (2 * margin);

var svg = d3.select('#map').append('svg')
          .attr('width', width)
          .attr('height', height);

queue()
  .defer(d3.json, '/data/sd.json')
  .defer(d3.json, '/data/ca-congress-114.json')
  .await(mapReady);
/*
$.post('/getLegislator', { district : "47"}, function(response) {
    $('#rep').text(response.first_name)
  });
*/
function mapReady(err, sd, congress) {
  if (err) console.error(err);

  /* Retrieve features from the sd object */
  var sdgeo = topojson.feature(sd, sd.objects.land);

  /* Calculate the center of sd, guess scale and offset */
  var center = d3.geo.centroid(sdgeo);
  var scale = 150;
  var offset = [width/2, height/2];
  var projection = d3.geo.mercator()
                      .scale(scale)
                      .center(center)
                      .translate(offset);

  var path = d3.geo.path()
                .projection(projection);

  var path = d3.geo.path()
    .projection(projection);

  /* Use calculated results to fix offset and scale */
  var bounds = path.bounds(sdgeo);
  var hscale = scale*width  / (bounds[1][0] - bounds[0][0]);
  var vscale = scale*height / (bounds[1][1] - bounds[0][1]);
  var scale  = (hscale < vscale) ? hscale : vscale;
  var offset  = [width + margin - (bounds[0][0] + bounds[1][0])/2,
                 height + margin - (bounds[0][1] + bounds[1][1])/2];

  projection = d3.geo.mercator()
                  .center(center)
                  .scale(scale)
                  .translate(offset);

  path = path.projection(projection);

  /* Filter out congress districts we don't want */
  congress.objects.districts.geometries = congress.objects.districts.geometries.filter(filterDistricts)

  /* Define the clipping area */
  svg.append('defs').append('path')
      .attr('id', 'land')
      .datum(sdgeo)
      .attr('d', path);

  svg.append('clipPath')
      .attr('id', 'clip-land')
    .append('use')
      .attr('xlink:href', '#land');

  /* Draw political districts */
  svg.append('g')
      .attr('class', 'districts')
      .attr('clip-path', 'url(#clip-land)')
    .selectAll('path')
      .data(topojson.feature(congress, congress.objects.districts).features)
    .enter()
      .append('path')
        .attr('d', path)
      .attr('class', function(d) { return 'district ' + d.id; })
      .attr('title', function(d) { return d.id; })
      .style('fill', district_defaultFill)
      .attr('onmouseover', 'district_onMouseOver(this)')
      .attr('onmouseout', 'district_onMouseOut(this)')

  /* Draw political district boundries */
  svg.append('path')
      .attr('class', 'district-boundaries')
      .datum(topojson.mesh(congress, congress.objects.districts, function(a, b) { return a !== b && (a.id / 1000 | 0) === (b.id / 1000 | 0); }))
      .attr('d', path);

  mapDone();
}

function filterDistricts(d) {
  return d.id >= 649 && d.id <= 653
}

function mapDone() {
  queue()
  .defer(d3.json, '/delphiData/getPopulationByDistrict?district=50')
  .defer(d3.json, '/delphiData/getPopulationByDistrict?district=50')
  .defer(d3.json, '/delphiData/getPopulationByDistrict?district=50')
  .await(chartReady);
}

function chartReady(err, data1, data2, data3) {
  drawDonut('chart1', data1, ['green', 'red']);
  drawDonut('chart2', data2, ['yellow', 'purple']);
  drawDonut('chart3', data3, ['orange', 'blue']);
}

})(window.jQuery, window.d3);


/**
 * Helper Functions
 */

function drawDonut(id, data, colors) {
  var width = $('#' + id).width(),
      donutWidth = width / 5,
      height = width,
      radius = width / 2;

  var color = d3.scale.ordinal()
                .range(colors); 

  var arc = d3.svg.arc()
              .innerRadius(radius - donutWidth)
              .outerRadius(radius);

  var pie = d3.layout.pie()
    .sort(null)
    .value( (d) => d.count );

  var svg = d3.select('#' + id)
              .append('svg')
                .attr('width', width)
                .attr('height', height)
              .append('g')
                .attr('transform', 'translate(' + (width / 2) + ',' + (height / 2) + ')');

  var path = svg.selectAll('path')
                .data(pie(data))
                .enter().append('path')
                  .attr('d', arc)
                  .attr('fill', (d, i) => color(d.data.label) )
                .transition()
                .duration(2000)
                .attrTween('d', tweenDonut);

  function tweenDonut(finish) {
    var start = {
      startAngle: 0,
      endAngle: 0
    };
    var i = d3.interpolate(start, finish);
    return (d) => arc(i(d));
  }
}


/**
 * Interaction Functions
 */

var district_defaultFill = '#ddd'
var district_defaultMouseoverFill = {
  6 : {
    49 : 'red',
    50 : 'yellow',
    51 : 'green',
    52 : 'purple',
    53 : 'blue'
  }
}

var district_mouseoverFill = district_defaultMouseoverFill;

function district_onMouseOver(me) {
  var $me = $(me)
  var geoId = district_getGeoId($me)

  $me.css('fill', district_mouseoverFill[geoId.state][geoId.district]);
}

function district_onMouseOut(me) {
  var $me = $(me)
  var geoId = district_getGeoId($me)

  $me.css('fill', district_defaultFill)
}

function district_getGeoId(obj) {
  // obj.attr('class') = "district (district $)"
  var geoid = obj.attr('class').substring(9)
  var state = geoid.slice(0,-2)
  var district = geoid.slice(-2)

  return { state: parseInt(state), district: parseInt(district) }
}
