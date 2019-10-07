'user strict';

let STORE = [];
let state;
let flag = false;


const parkApi = "iOR3pCtgHytQXyLqBG0NghZScVpfPl3yfkccrEvB";
const googleApi = "AIzaSyAiXf-w3mmDqvhBcI0742QKBPap0D0c-PM";

const searchGoogleUrl = "https://maps.googleapis.com/maps/api/";
const searchParkURL = "https://developer.nps.gov/api/v1/parks";
const proxyurl = "https://cors-anywhere.herokuapp.com/";

/*Formats the url with query parameters*/
function formatQueryParams(params) {
  const queryItems = Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
  return queryItems.join('&');
}

/*Gets image from google place api*/
function getImg(candidate) {


  let imgHTML;
  if (typeof candidate.photos !== 'undefined') {
    const photoReference = candidate.photos[0].photo_reference;
    let url = searchGoogleUrl + "place/photo?";
    const params = {
      maxheight: "210",
      maxwidth: "210",
      photo_reference: photoReference,
      key: googleApi,
    };

    const queryString = formatQueryParams(params);
    url += queryString;
    imgHTML = `<img src="${url}"/>`;
  } else {
    imgHTML = '<img src="./images/No-image.png" alt="No image available"/>';
  }
  return imgHTML;
}


/*Displays the price level*/
function displayPrice(candidate) {
  let priceLevelHTML = "";
  if (typeof candidate.price_level !== 'undefined' || candidate.price_level > 0) {
    for (let i = 0; i < candidate.price_level; i++) {
      priceLevelHTML += `<i class="price fas fa-dollar-sign"></i>`;
    }
  }
  return priceLevelHTML;
}

/*Check for specific word in string*/
function wordInStr(s, word) {
  return new RegExp("\\b" + word + "\\b", 'i').test(s);
}

/*Format the formated address from google api into two lines*/
function formatAddress(address) {
  const pos = address.indexOf(',');
  const str1 = address.slice(0, pos);
  const str2 = address.slice(pos + 1);
  const addressHTML = `
    <p>${str1}</p>
    <p>${str2}</p>
  `;
  return addressHTML;
}

/*Get total user rating of the restaurant*/
function getTotalUserRating(candidate) {
  if (typeof candidate.user_ratings_total !== 'undefined' || candidate.user_ratings_total >= 0) {
    return `${candidate.user_ratings_total} Reviews`;
  }
  return '';
}

/*List details of restaurants*/
function displayFoodResults(responseJson) {
  for (let i = 0; i < responseJson.candidates.length; i++) {
    let candidate = responseJson.candidates[i];
    //Makes sure the restaurant is in the state user provided
    if (candidate.formatted_address && wordInStr(candidate.formatted_address, state)) {
      $('.js-error-message').empty();
      flag = true;
      $('#results-list').append(
        `
      <li>
        <div class="candidate">
          <div class="img-container">
            ${getImg(candidate)}
          </div>
          <div class="candidate-details">
            <div class="column">
              <h3 class="candidate-name">${candidate.name}</h3>
              <section class="rating">${displayRating(candidate)}</section>
              <p class="rating-total">${getTotalUserRating(candidate)}</p>
              <section class="price-level">${displayPrice(candidate)}</section>
            </div>
            <div class="column">
              <p class="candidate-address">${formatAddress(candidate.formatted_address)}</p>
            </div>
          </div>
        </div>
      </li>
      `
      );
    } else if (!flag) {
      $('.js-error-message').text("Sorry, it seems there are no restaurants near this park.");
    }
  }
}

/*Get details of a restaurant*/
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
  fetch(proxyurl + url)
    .then(response => {
      if (response.ok) {
        return response.json();
      }
      throw new Error(response.statusText);
    })
    .then(responseJson => {
      displayFoodResults(responseJson);
    })
    .catch(err => {
      $('.js-error-message').text(`Something went wrong in getVenueDetail: ${err.message}`);
    });
}

/*Get all restaurants near the selected park*/
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

  fetch(proxyurl + url)
    .then(response => {
      if (response.ok) {
        return response.json();
      }
      throw new Error(response.statusText);
    })
    .then(responseJson => {
      $('#results-list').empty();

      if (responseJson.results.length > 0) {
        for (let i = 0; i < responseJson.results.length; i++) {
          getVenueDetail(responseJson.results[i].name);
        }
      } else {
        $('.js-error-message').text('Sorry, there are no restaurants near this park.');
      }
    })
    .catch(err => {
      $('.js-error-message').text(`Something went wrong in getVenues: ${err.message}`);
    });
}

/*Show the restaurants near the park based on the geocode of the park*/
function displaySelectedParkEats(park) {

  let geoCode = park.geoCode;
  let regex = /[+-]?\d+(\.\d+)?/g;
  let floats = geoCode.match(regex).map(function (v) { return parseFloat(v); });
  let near = floats[0] + "," + floats[1];
  getVenues(near);
}

/*Get geocode of the park based on park address*/
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
      if (response.ok) {
        return response.json();
      }
      throw new Error(response.statusText);
    })
    .then(responseJson => {
      let lat = responseJson.results[0].geometry.location.lat;
      let long = responseJson.results[0].geometry.location.lng;
      park.geoCode = lat + "," + long;
      displaySelectedParkEats(park);
    })
    .catch(err => {
      $('.js-error-message').text(`Something went wrong in getGeocode: ${err.message}`);
    });
}

/*Select park by clicking on the image*/
function getSelectedParkEats() {
  $('#eats-results #results-list').on('click', '.candidate-name', function (event) {
    const id = $(this).closest('li').find('.candidate').attr('id');
    let park;
    for (let i = 0; i < STORE.length; i++) {
      if (STORE[i].id === id) {
        park = STORE[i];
      }
    }

    //If geocode is missing from park api, get the geocode
    //with park address. Otherwise, show that there are no
    //restaurants near the park
    if (!park.geoCode) {
      if (park.address.length !== 0) {
        let address = getParkAddress(park.address);
        getGeocode(park, address);
      } else {
        $('#eats-results #results-list').empty();
        $('.js-error-message').text('Sorry, there are no restaurants neaby this park.');
      }

    } else {
      displaySelectedParkEats(park);
    }

  });
}

/*Get selected park by clicking on park name*/
function getSelectedParkEatsImg() {
  $('#eats-results #results-list').on('click', '.candidate-img', function (event) {
    const id = $(this).closest('li').find('.candidate').attr('id');
    let park;
    for (let i = 0; i < STORE.length; i++) {
      if (STORE[i].id === id) {
        park = STORE[i];
      }
    }

    if (!park.geoCode) {
      if (park.address.length !== 0) {
        let address = getParkAddress(park.address);
        getGeocode(park, address);
      } else {
        $('#eats-results #results-list').empty();
        $('.js-error-message').text('Sorry, there are no restaurants neaby this park.');
      }
    } else {
      displaySelectedParkEats(park);
    }
  });
}

/*Get park images if there are any. Otherwise, show that there are no images available*/
function getParkImgs(photos) {
  let photosHTML = '';
  if (photos === null || photos.length === 0) {
    photosHTML = `<div class="photo"><img src="./images/No-image.png" alt="no image"/></div>`;
  } else {
    for (let i = 0; i < photos.length; i++) {
      photosHTML += `<div class="photo"><a target="_blank" href=${photos[i].url}><img src=${photos[i].url} alt=${photos[i].altText}/></a></div>`;
    }
  }
  return photosHTML;
}

/*Get park phone number and email if there are any*/
function getParkOtherContacts(park) {
  let contactsHTML = '';
  if (park.phoneNumbers !== null && park.phoneNumbers.length > 0) {
    contactsHTML += `<p>${formatPhoneNumber(park.phoneNumbers[0].phoneNumber)}</p>`;
  }
  if (park.emailAddresses !== null && park.emailAddresses.length > 0) {
    contactsHTML += `<p>${park.emailAddresses[0].emailAddress}</p>`;
  }
  return contactsHTML;
}

/*Get park description if there's any*/
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

/*Get park weather if there's any*/
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

/*Get park passes*/
function getParkPasses(park) {
  let passHTML = '';
  for (let i = 0; i < park.entrancePasses.length; i++) {
    passHTML +=
      `
    <p class="fee-title">${park.entrancePasses[i].title}</p>
    <p>Fee: $${parseFloat(park.entrancePasses[i].cost).toFixed(2)}</p>
    <p class="fee-description">${park.entrancePasses[i].description}</p>
    `;
  }
  return passHTML;
}

/*Get park fees*/
function getFees(park) {
  let feesHTML = '';
  for (let i = 0; i < park.entranceFees.length; i++) {
    feesHTML +=
      `
    <p class="fee-title">${park.entranceFees[i].title}</p>
    <p>Fee: $${parseFloat(park.entranceFees[i].cost).toFixed(2)}</p>
    <p class="fee-description">${park.entranceFees[i].description}</p>
    `;
  }
  return feesHTML;
}

/*Get park fees/passes if there are any*/
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

/*Get park directions if there's any*/
function getParkDirections(url) {
  if (url !== null && url !== "") {
    const directionsUrl =
      `<a class="direction" target="_blank" href=${url}>Directions</a>`;
    return directionsUrl;
  }
  return "";
}

/*Display park details based on the selected park*/
function displaySelectedPark(park) {
  $('#park-results #results-list').empty();
  $('#park-details').empty();
  $('#park-details').append(
    `
    <div class="wrapper">
        <div class="image-container">${getParkImgs(park.photos)}</div>
        <h3 class="park-name"><a target="_blank" class="parkUrl" href=${park.url}>${park.name}</a></h3>
        <section class="park-contacts">
          <div class="column address">
          ${displayParkAddress(park.address)}
          ${getParkDirections(park.directionsUrl)}
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

/*Select park by clicking on the image*/
function getSelectedParkImg() {
  $('#park-results #results-list').on('click', '.candidate-img', function (event) {
    const id = $(this).closest('li').find('.candidate').attr('id');
    let park;
    for (let i = 0; i < STORE.length; i++) {
      if (STORE[i].id === id) {
        park = STORE[i];
      }
    }
    displaySelectedPark(park);
  });
}

/*Select park by clicking on the park name*/
function getSelectedPark() {
  $('#park-results #results-list').on('click', '.candidate-name', function (event) {
    const id = $(this).closest('li').find('.candidate').attr('id');
    let park;
    for (let i = 0; i < STORE.length; i++) {
      if (STORE[i].id === id) {
        park = STORE[i];
      }
    }
    displaySelectedPark(park);
  });
}

/*Show park rating stars*/
function displayRating(candidate) {
  let ratingHTML = "";
  if (typeof candidate.rating !== 'undefined' || candidate.rating === 0) {
    let num = candidate.rating;
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
  }
  return ratingHTML;
}

/*If no park rating available, show nothing*/
function undefinedRating(i) {
  $("#park-rating" + i).text("");
}

/*Display park rating and total number of reviews if there are any*/
function displayParkRating(responseJson, i) {
  let parkRatingHTML;

  if (typeof responseJson.candidates[0].user_ratings_total !== 'undefined' || responseJson.candidates[0].user_ratings_total >= 0) {
    parkRatingHTML = `
    <div class="rating">${displayRating(responseJson.candidates[0])}</div>
    <p class="rating-total">${responseJson.candidates[0].user_ratings_total} Reviews</p>
  `;
  } else {
    undefinedRating(i);
  }

  let id = "#park-rating" + i;

  $(id).html(parkRatingHTML);
}

/*Get parking rating with google place api*/
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
  fetch(proxyurl + url)
    .then(response => {
      if (response.ok) {
        return response.json();
      }
      throw new Error(response.statusText);
    })
    .then(responseJson => {
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

/*Helper function of getGeocode()*/
function getParkAddress(addresses) {
  let address = addresses[0];
  return `${address.line1} ${address.city}, ${address.stateCode} ${address.postalCode}`;

}

/*Display park address in listed of parks. If no address, show no address available*/
function displayParkAddress(addresses) {
  let addressHTML;
  if (addresses.length > 0) {
    let physicalAddress = {};
    for (let i = 0; i < addresses.length; i++) {
      if (addresses[i].type === "Physical") {
        physicalAddress = addresses[i];
      }
    }
    if (physicalAddress.length === 0) {
      physicalAddress = addresses[0];
    }
    addressHTML = `
      <p>${physicalAddress.line1}</p>
      <p>${physicalAddress.city}, ${physicalAddress.stateCode} ${physicalAddress.postalCode}</p>
    `;

  } else {
    addressHTML = '<p>No address available</p>';
  }
  return addressHTML;
}

/*Format phone numbers in the format 
(###) ###-#### or +1 (###) ###-####*/
function formatPhoneNumber(phoneNum) {
  let cleaned = ('' + phoneNum).replace(/\D/g, '');
  let match = cleaned.match(/^(1|)?(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    let intlCode = (match[1] ? '+1 ' : '');
    return [intlCode, '(', match[2], ') ', match[3], '-', match[4]].join('');
  }
  return "";
}

/*Get header image for listed of parks. If no image, show no image available*/
function getCandidateImg(images) {
  let imageHTML;
  if (images.length === 0) {
    imageHTML =
      '<a href="#" class="candidate-img"><img src="./images/No-image.png" alt="no image"/></a>';
  } else {
    imageHTML =
      `<a href="#" class="candidate-img"><img src=${images[0].url} alt=${images[0].altText}/></a>`;
  }
  return imageHTML;
}

function getPhoneNumber(phoneNumbers) {
  let phoneNumberHTML;
  if (phoneNumbers.length > 0) {
    phoneNumberHTML =
      `<p class="candidate-phoneNum">${formatPhoneNumber(phoneNumbers[0].phoneNumber)}</p>`;
  } else {
    phoneNumberHTML =
      `<p class="candidate-phoneNum"></p>`;
  }
  return phoneNumberHTML;
}

/*Display a list of parks based on state code provided by user*/
function displayParkResults(responseJson) {
  $('#results-list').empty();
  $('.js-error-message').empty();
  for (let i = 0; i < responseJson.data.length; i++) {
    const parkCandidate = responseJson.data[i];

    $('#results-list').append(
      `<li>
        <div class="candidate" id="c${i}">
          <div class="img-container">
            ${getCandidateImg(parkCandidate.images)}
          </div>
          <div class="candidate-details">
            <div class="column">
              <h3 class="candidate-name"><a href="#" class="park-candidate">${parkCandidate.fullName}</a></h3>
              <section id="park-rating${i}">${getParkRating(parkCandidate.fullName, i)}</section>
            </div>
            <div class="column">
              <section class="candidate-address">${displayParkAddress(parkCandidate.addresses)}</section>
              ${getPhoneNumber(parkCandidate.contacts.phoneNumbers)}   
            </div>
          </div>
        </div>
      </li>`
    );

    //Store each park information in STORE array for later uses
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

/*Get all the parks in the state provided by the user*/
function getParks(states) {
  const params = {
    stateCode: states.split(","),
    fields: "addresses,contacts,emailAddresses,entranceFees,entrancePasses,images",
    api_key: parkApi,
  };

  const queryString = formatQueryParams(params);
  const url = searchParkURL + '?' + queryString;

  fetch(url)
    .then(response => {
      if (response.ok) {
        return response.json();
      }
      throw new Error(response.statusText);
    })
    .then(responseJson => {
      //Ensure the correct state code was provided
      if (responseJson.data.length > 0) {
        displayParkResults(responseJson);
      } else {
        $('.js-error-message').text('Please enter the correct state code.');
      }
    })
    .catch(err => {
      $('.js-error-message').text(`Something went wrong in getParks: ${err.message}`);
    });
}

/*Preloading until all park information are retrieved from national parks api*/
function preload() {
  document.getElementById("hidden").style.display = "none";
  document.getElementById("loader").style.display = "block";
  let waitTime = setTimeout(showPage, 17000);
}

/*Show page contents when all information are loaded from national parks api*/
function showPage() {
  document.getElementById("loader").style.display = "none";
  document.getElementById("hidden").style.display = "block";
}

//Watch when form is submitted by user.
//Ensure only one state code is provided
function watchForm() {
  $('form').on('submit', function (event) {
    event.preventDefault();
    STORE.length = 0;
    $('#results-list').empty();
    $('#park-details').empty();
    state = $('.js-state').val();
    state = state.toUpperCase();
    $('.js-error-message').empty();
    if (state.length <= 2) {
      getParks(state);
      preload();
    } else {
      $('.js-error-message').text('Please enter no more than one state code.');
    }
  });
}



function handleApp() {
  watchForm();
  getSelectedPark();
  getSelectedParkImg();
  getSelectedParkEats();
  getSelectedParkEatsImg();
}

$(handleApp);