'user strict';

let STORE = [];
let state;

const parkApi = "iOR3pCtgHytQXyLqBG0NghZScVpfPl3yfkccrEvB";
const googleApi = "AIzaSyAiXf-w3mmDqvhBcI0742QKBPap0D0c-PM";

const searchGoogleUrl = "https://maps.googleapis.com/maps/api/";
const searchParkURL = "https://developer.nps.gov/api/v1/parks";
const proxyurl = "https://cors-anywhere.herokuapp.com/";


function formatQueryParams(params) {
  const queryItems = Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
  return queryItems.join('&');
}

function getImg(photoReference) {
  let url = searchGoogleUrl + "place/photo?";
  const params = {
    maxheight: "210",
    maxwidth: "210",
    photo_reference: photoReference,
    key: googleApi,
  };

  const queryString = formatQueryParams(params);
  url += queryString;
  //console.log(url);
  return url;
}



function displayPrice(price) {
  let priceLevelHTML = "";
  for (let i = 0; i < price; i++) {
    priceLevelHTML += `<i class="price fas fa-dollar-sign"></i>`;
  }
  return priceLevelHTML;
}

function wordInStr(s, word) {
  return new RegExp("\\b" + word + "\\b").test(s);
}

function displayFoodResults(responseJson) {
  //alert("display restaurant");
  //alert('results0');
  //alert('results1');
  //console.log(responseJson);
  //$('#results-list').empty();
  //alert('results2');
  for (let i = 0; i < responseJson.candidates.length; i++) {
    //alert('results3');
    let candidate = responseJson.candidates[i];
    //console.log("In state: " + wordInStr(candidate.formatted_address, state));
    if (wordInStr(candidate.formatted_address, state)) {
      $('.js-error-message').empty();
      $('#results-list').append(
        `
      <li>
        <div class="candidate">
          <div class="img-container">
            <img src="${getImg(candidate.photos[0].photo_reference)}"/>
          </div>
          <div class="candidate-details">
            <div class="column">
              <h3 class="candidate-name">${candidate.name}</h3>
              <section class="rating">${displayRating(candidate.rating)}</section>
              <p class="rating-total">${candidate.user_ratings_total} Reviews</p>
              <section class="price-level">${displayPrice(candidate.price_level)}</section>
            </div>
            <div class="column">
              <p class="candidate-address">${candidate.formatted_address}</p>
            </div>
          </div>
        </div>
      </li>
      `
      );
    } else {
      $('.js-error-message').text("Sorry, it seems there are no restaurants near this park.");
    }


  }

}


function getVenueDetail(find) {
  let url = searchGoogleUrl + "place/findplacefromtext/json?";
  const params = {
    input: find,
    inputtype: "textquery",
    fields: "formatted_address,name,photos,price_level,rating,user_ratings_total",
    key: googleApi,
  };

  const queryString = formatQueryParams(params);
  url += queryString;
  //console.log(url);
  fetch(proxyurl + url)
    .then(response => {
      //alert("reponse1");
      if (response.ok) {
        //alert("reponse2");
        return response.json();
      }
      throw new Error(response.statusText);
    })
    .then(responseJson => {
      displayFoodResults(responseJson);
    })
    .catch(err => {
      //alert("getVenueDetail error " + err.message);
      $('.js-error-message').text(`Something went wrong in getVenueDetail: ${err.message}`);
    });
}

function getVenues(find, near) {
  let url = searchGoogleUrl + "place/nearbysearch/json?";
  const params = {
    location: near,
    rankby: "distance",
    keyword: find,
    type: "restaurant",
    key: googleApi,
  };

  const queryString = formatQueryParams(params);
  url += queryString;
  //console.log(url);

  fetch(proxyurl + url)
    .then(response => {
      //alert("getVenues in");
      if (response.ok) {
        //alert("getVenues response ok");
        return response.json();
      }
      //alert("getVenues response not ok");
      throw new Error(response.statusText);
    })
    .then(responseJson => {
      $('#results-list').empty();
      //alert("getVenues responseJson reached");
      //console.log("getVenue responseJson... " + JSON.stringify(responseJson));
      //console.log("responseJson length... " + responseJson.results.length);
      for (let i = 0; i < responseJson.results.length; i++) {
        //alert("loop " + i);
        getVenueDetail(responseJson.results[i].name);
      }
    })
    .catch(err => {
      //alert("getVenues error" + err.message);
      $('.js-error-message').text(`Something went wrong in getVenues: ${err.message}`);
    });
}

function displaySelectedPark(park) {

  let geoCode = park.geoCode;
  let regex = /[+-]?\d+(\.\d+)?/g;
  let floats = geoCode.match(regex).map(function (v) { return parseFloat(v); });
  let near = floats[0] + "," + floats[1];
  //console.log(near);
  //$('#results-list').empty();
  getVenues("food", near);
}

function getGeocode(park, address) {
  let url = searchGoogleUrl + "geocode/json?";
  const params = {
    address: address,
    key: googleApi,
  };

  const queryString = formatQueryParams(params);
  url += queryString;

  fetch(proxyurl + url)
    .then(response => {
      //alert("getVenues in");
      if (response.ok) {
        //alert("getVenues response ok");
        return response.json();
      }
      //alert("getVenues response not ok");
      throw new Error(response.statusText);
    })
    .then(responseJson => {
      let lat = responseJson.results[0].geometry.location.lat;
      let long = responseJson.results[0].geometry.location.lng;
      park.geoCode = lat + "," + long;
      displaySelectedPark(park);
    })
    .catch(err => {
      //alert("getVenues error" + err.message);
      $('.js-error-message').text(`Something went wrong in getGeocode: ${err.message}`);
    });
}

function getSelectedPark() {
  $('#results-list').on('click', '.candidate-name', function (event) {
    //alert("park selected");
    const id = $(this).closest('li').find('.candidate').attr('id');
    //alert("park id: " + id);
    let park;
    for (let i = 0; i < STORE.length; i++) {
      if (STORE[i].id === id) {
        park = STORE[i];
      }
    }
    //console.log(park.geoCode);

    if (!park.geoCode) {
      //alert("need to get geocode");
      let address = getParkAddress(park.address);
      getGeocode(park, address);
    } else {
      displaySelectedPark(park);
    }

  });
}

function displayRating(num) {
  //let num = Number(rating);
  let ratingHTML = "";
  for (let i = 0; i < 5; i++) {
    if (num >= 1 || (num < 1 && num > 0.5)) {
      ratingHTML += `<i class="star full-star fas fa-star"></i>`;
    } else if (num <= 0.5 && num > 0) {
      ratingHTML += `<i class="star half-star fas fa-star-half-alt"></i>`;
    } else {
      ratingHTML += `<i class="star no-star far fa-star"></i>`;
    }
    num--;
  }
  return ratingHTML;
}

function displayParkRating(responseJson, i) {
  //console.log("park rating: " + JSON.stringify(responseJson));
  //console.log("park rating: " + responseJson);
  const parkRatingHTML = `
    <div class="rating">${displayRating(responseJson.candidates[0].rating)}</div>
    <p class="rating-total">${responseJson.candidates[0].user_ratings_total} Reviews</p>
  `;

  let id = "#park-rating" + i;

  $(id).html(parkRatingHTML);
}

function getParkRating(park, i) {
  let url = searchGoogleUrl + "place/findplacefromtext/json?";
  const params = {
    input: park,
    inputtype: "textquery",
    fields: "rating,user_ratings_total",
    key: googleApi,
  };

  const queryString = formatQueryParams(params);
  url += queryString;
  //console.log(url);
  fetch(proxyurl + url)
    .then(response => {
      //alert("getParkRating1");
      if (response.ok) {
        //alert("getParkRating2");
        return response.json();
      }
      throw new Error(response.statusText);
    })
    .then(responseJson => {
      //console.log("responseJson reached... " + responseJson);
      displayParkRating(responseJson, i);
    })
    .catch(err => {
      $('.js-error-message').text(`Something went wrong in getParkRating: ${err.message}`);
    });
}

function getParkAddress(addresses) {
  let address = addresses[0];
  return `${address.line1} ${address.city}, ${address.stateCode} ${address.postalCode}`;

}

function displayParkAddress(addresses) {
  if (addresses.length > 0) {
    let physicalAddress = {};
    for (let i = 0; i < addresses.length; i++) {
      if (addresses[i].type === "Physical") {
        physicalAddress = addresses[i];
      }
    }
    const addressHTML = `
      <p>${physicalAddress.line1}</p>
      <p>${physicalAddress.city}, ${physicalAddress.stateCode} ${physicalAddress.postalCode}</p>
    `;
    return addressHTML;
  }
}

function displayParkResults(responseJson) {
  //alert("result1");
  //console.log(responseJson);
  $('#results-list').empty();
  $('.js-error-message').empty();
  //alert("result2");
  for (let i = 0; i < responseJson.data.length; i++) {
    //alert("responseJson in forloop");
    const parkCandidate = responseJson.data[i];
    //console.log("parkCandidate created... " + Object.keys(parkCandidate));
    $('#results-list').append(
      `<li>
        <div class="candidate" id="c${i}">
          <div class="img-container">
            <img src=${parkCandidate.images[0].url} alt=${parkCandidate.images[0].altText}/>
          </div>
          <div class="candidate-details">
            <div class="column">
              <h3 class="candidate-name"><a href="#">${parkCandidate.fullName}</a></h3>
              <section id="park-rating${i}">${getParkRating(parkCandidate.fullName, i)}</section>
            </div>
            <div class="column">
              <section class="candidate-address">${displayParkAddress(parkCandidate.addresses)}</section>
              <p class="candidate-phoneNum">${parkCandidate.contacts.phoneNumbers[0].phoneNumber}</p>
            </div>
          </div>
        </div>
      </li>`
    );
    //alert('loop ' + i);
    STORE.push({
      id: `c${i}`,
      name: parkCandidate.fullName,
      address: parkCandidate.addresses,
      photos: parkCandidate.images,
      contacts: parkCandidate.contacts,
      emailAddresses: parkCandidate.emailAddresses,
      entranceFees: parkCandidate.entranceFees,
      entrancePasses: parkCandidate.entrancePasses,
      geoCode: parkCandidate.latLong,
      description: parkCandidate.description,
      weather: parkCandidate.weatherInfo,
      url: parkCandidate.url,
      directionsUrl: parkCandidate.directionsUrl,
    });
  }
}

function getParks(states) {
  const params = {
    stateCode: states.split(","),
    fields: "addresses,contacts,emailAddresses,entranceFees,entrancePasses,images",
    limit: "5",
    api_key: parkApi,
  };

  const queryString = formatQueryParams(params);
  const url = searchParkURL + '?' + queryString;
  //console.log(url);

  fetch(url)
    .then(response => {
      //console.log("response" + response);
      if (response.ok) {
        //alert("response is ok");
        return response.json();
      }
      //alert("response is not ok");
      //alert("getParks1");
      throw new Error(response.statusText);
    })
    .then(responseJson => {
      //alert("responseJson received");
      //console.log("reponseJson is ... " + responseJson);
      if (responseJson.data.length > 0) {
        displayParkResults(responseJson);
      } else {
        $('.js-error-message').text('Please enter the correct state code.');
      }
    })
    .catch(err => {
      //alert('error caught');
      $('.js-error-message').text(`Something went wrong in getParks: ${err.message}`);
    });
}

function watchForm() {
  $('form').on('submit', function (event) {
    //alert("form submitted");
    event.preventDefault();
    //STORE = [];
    STORE.length = 0;
    //$('#results-list').empty();
    state = $('.js-state').val();
    //alert(state.length);
    $('.js-error-message').empty();
    if (state.length <= 2) {
      getParks(state);
    } else {
      $('.js-error-message').text('Please enter no more than one state code.');
    }

  });
}



function handleApp() {
  watchForm();
  //handleSearchDisplay();
  getSelectedPark();
  //displayRating("5");
}

$(handleApp);