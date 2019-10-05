'user strict';

let STORE = [];
let state;
let flag = false;

const parkApi = "iOR3pCtgHytQXyLqBG0NghZScVpfPl3yfkccrEvB";
const googleApi = "";

const searchGoogleUrl = "https://maps.googleapis.com/maps/api/";
const searchParkURL = "https://developer.nps.gov/api/v1/parks";
const proxyurl = "";


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
  return new RegExp("\\b" + word + "\\b", 'i').test(s);
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
      flag = true;
      //alert("yes restaurants");
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
    } else if (!flag) {
      //alert("no restaurants");
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

function getVenues(near) {
  let url = searchGoogleUrl + "place/nearbysearch/json?";
  const params = {
    location: near,
    rankby: "distance",
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
      if (responseJson.results.length > 0) {
        for (let i = 0; i < responseJson.results.length; i++) {
          //alert("loop " + i);
          getVenueDetail(responseJson.results[i].name);
        }
      } else {
        $('.js-error-message').text('Sorry, there are no restaurants near this park.');
      }

    })
    .catch(err => {
      //alert("getVenues error" + err.message);
      $('.js-error-message').text(`Something went wrong in getVenues: ${err.message}`);
    });
}

function displaySelectedParkEats(park) {

  let geoCode = park.geoCode;
  let regex = /[+-]?\d+(\.\d+)?/g;
  let floats = geoCode.match(regex).map(function (v) { return parseFloat(v); });
  let near = floats[0] + "," + floats[1];
  //console.log(near);
  //$('#results-list').empty();
  //alert("getting venues nearby");
  getVenues(near);
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
      displaySelectedParkEats(park);
    })
    .catch(err => {
      //alert("getVenues error" + err.message);
      $('.js-error-message').text(`Something went wrong in getGeocode: ${err.message}`);
    });
}

function getSelectedParkEats() {
  $('#eats-results #results-list').on('click', '.candidate-name', function (event) {
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
      displaySelectedParkEats(park);
    }

  });
}

function getSelectedParkEatsImg() {
  $('#eats-results #results-list').on('click', '.candidate-img', function (event) {
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
      displaySelectedParkEats(park);
    }

  });
}

function getParkImgs(photos) {
  let photosHTML = '';
  if (photos === null || photos.length === 0) {
    //alert("choice1");
    photosHTML = `<img src="./images/No-image.png" alt="no image"/>`;
  } else if (photos.length <= 3) {
    //alert("choice2");
    for (let i = 0; i < photos.length; i++) {
      photosHTML += `<a href=${photos[i].url}><img src=${photos[i].url} alt=${photos[i].altText}/></a>`;
    }
  } else {
    //alert("choice3");
    for (let i = 0; i < 3; i++) {
      //console.log(photos[i].url);
      photosHTML += `<div class="photo"><a href=${photos[i].url}><img src=${photos[i].url} alt=${photos[i].altText}/></a></div>`;
    }

    photosHTML += `<button onclick="javascript:location.href='./parkImgs'">View more</button>`;
  }
  console.log("photosHTML... " + photosHTML);
  return photosHTML;
}

function getParkOtherContacts(park) {
  let contactsHTML = '';
  if (park.phoneNumbers !== null && park.phoneNumbers.length > 0) {
    contactsHTML += `<p>${park.phoneNumbers[0].phoneNumber}</p>`;
  }
  if (park.emailAddresses !== null && park.emailAddresses.length > 0) {
    contactsHTML += `<p>${park.emailAddresses[0].emailAddress}</p>`;
  }
  return contactsHTML;
}

function getParkDescription(park) {
  let descriptionHTML = '';
  if (park.description !== null && park.description !== '') {
    descriptionHTML +=
      `<section class="park-description">
      <h4>About</h4>
      <p>${park.description}</p>
    </section>`;
  }
  return descriptionHTML;
}

function getParkWeather(park) {
  let weatherHTML = '';
  if (park.weather !== null && park.weather !== '') {
    weatherHTML +=
      `<section class="park-weather">
      <h4>Weather</h4>
      <p>${park.weather}</p>
    </section>`;
  }
  return weatherHTML;
}

function getParkPasses(park) {
  let passHTML = '';
  for (let i = 0; i < park.entrancePasses.length; i++) {
    passHTML +=
      `
    <p class="fee-title">${park.entrancePasses[i].title}</p>
    <p>Fee: $${park.entrancePasses[i].cost}</p>
    <p class="fee-description">${park.entrancePasses[i].description}</p>
    `;
  }
  return passHTML;
}

function getFees(park) {
  let feesHTML = '';
  for (let i = 0; i < park.entranceFees.length; i++) {
    feesHTML +=
      `
    <p class="fee-title">${park.entranceFees[i].title}</p>
    <p>Fee: $${park.entranceFees[i].cost}</p>
    <p class="fee-description">${park.entranceFees[i].description}</p>
    `;
  }
  return feesHTML;
}

function getParkFees(park) {
  let feesHTML = '';
  if (park.entranceFees.length === 0 && park.entrancePasses.length > 0) {
    feesHTML +=
      `
    <section class="park-fees">
      <div class="column fees">
        <h4>Entrance Fees</h4>
        No entrance fees available
      </div>
      <div class="column passes">
        <h4>Entrance Passes</h4>
        ${getParkPasses(park)}
      </div>
    </section>
    `;
  } else if (park.entranceFees.length > 0 && park.entrancePasses.length === 0) {
    feesHTML +=
      `
    <section class="park-fees">
      <div class="column fees">
        <h4>Entrance Fees</h4>
        ${getFees(park)}
      </div>
      <div class="column passes">
        <h4>Entrance Passes</h4>
        No entrance pass available
      </div>
    </section>
    `;
  } else if (park.entranceFees.length > 0 && park.entrancePasses.length > 0) {
    feesHTML +=
      `
    <section class="park-fees">
      <div class="column fees">
        <h4>Entrance Fees</h4>
        ${getFees(park)}
      </div>
      <div class="column passes">
        <h4>Entrance Passes</h4>
        ${getParkPasses(park)}
      </div>
    </section>
    `;
  }
  return feesHTML;
}

function displaySelectedPark(park) {
  $('#park-results #results-list').empty();
  $('#park-details').empty();
  $('#park-details').append(
    `
    <div class="wrapper">
        <div class="image-container">${getParkImgs(park.photos)}</div>
        <h3 class="park-name"><a href=${park.url}>${park.name}</a></h3>
        <section class="park-contacts">
          <div class="column address">
          ${displayParkAddress(park.address)}
          <a href=${park.directionsUrl}>Directions</a>
          </div>
          <div class="column phone email">${getParkOtherContacts(park)}</div>
        </section>
        ${getParkDescription(park)}
        ${getParkWeather(park)}
        ${getParkFees(park)}
    </div>
    `
  );
}

function getSelectedParkImg() {
  $('#park-results #results-list').on('click', '.candidate-img', function (event) {
    //alert("park selected");
    const id = $(this).closest('li').find('.candidate').attr('id');
    //alert("park id: " + id);
    let park;
    for (let i = 0; i < STORE.length; i++) {
      if (STORE[i].id === id) {
        park = STORE[i];
      }
    }
    displaySelectedPark(park);

  });
}

function getSelectedPark() {
  $('#park-results #results-list').on('click', '.candidate-name', function (event) {
    //alert("park selected");
    const id = $(this).closest('li').find('.candidate').attr('id');
    //alert("park id: " + id);
    let park;
    for (let i = 0; i < STORE.length; i++) {
      if (STORE[i].id === id) {
        park = STORE[i];
      }
    }
    displaySelectedPark(park);

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

function undefinedRating(i) {
  $("#park-rating" + i).text("");
}

function displayParkRating(responseJson, i) {
  //console.log("park rating: " + JSON.stringify(responseJson));
  //console.log("park rating: " + responseJson);
  let parkRatingHTML;

  if (responseJson.candidates[0].user_ratings_total >= 0) {
    parkRatingHTML = `
    <div class="rating">${displayRating(responseJson.candidates[0].rating)}</div>
    <p class="rating-total">${responseJson.candidates[0].user_ratings_total} Reviews</p>
  `;
  } else {
    undefinedRating(i);
  }

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
      if (responseJson.candidates.length > 0) {
        displayParkRating(responseJson, i);
      } else {
        undefinedRating(i);
      }
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
  //console.log(JSON.stringify(responseJson));
  $('#results-list').empty();
  $('.js-error-message').empty();
  //alert("result2");
  for (let i = 0; i < responseJson.data.length; i++) {
    //alert("responseJson in forloop");
    const parkCandidate = responseJson.data[i];
    //console.log("parkCandidate created... " + Object.keys(parkCandidate));
    if (parkCandidate.images.length === 0) {
      $('#results-list').append(
        `<li>
        <div class="candidate" id="c${i}">
          <div class="img-container">
            <a href="#" class="candidate-img"><img src="./images/No-image.png" alt="no image"/></a>
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
    } else {
      $('#results-list').append(
        `<li>
        <div class="candidate" id="c${i}">
          <div class="img-container">
            <a href="#" class="candidate-img"><img src=${parkCandidate.images[0].url} alt=${parkCandidate.images[0].altText}/></a>
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
    }
    //alert('loop ' + i);
    STORE.push({
      id: `c${i}`,
      name: parkCandidate.fullName,
      address: parkCandidate.addresses,
      photos: parkCandidate.images,
      phoneNumbers: parkCandidate.contacts.phoneNumbers,
      emailAddresses: parkCandidate.contacts.emailAddresses,
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
  //alert(url);

  fetch(url)
    .then(response => {
      //console.log("response" + response);
      //alert("response ok?");
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
      //console.log("reponseJson is ... " + JSON.stringify(responseJson));
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
    $('#park-details').empty();
    state = $('.js-state').val();
    //alert(state.length);
    state = state.toUpperCase();
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
  getSelectedParkImg();
  getSelectedParkEats();
  getSelectedParkEatsImg();
  //displayRating("5");
}

$(handleApp);