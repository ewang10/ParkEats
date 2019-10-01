'user strict';

const hereAppID = "B1HVlBoZ1AmUk9dTpRBt";
const hereAppCode = "Y2o-yq9auIlAe9mFO-9p4A";
const googleApi = "";

const searchUrl = "https://maps.googleapis.com/maps/api/";

function formatQueryParams(params) {
    const queryItems = Object.keys(params)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    return queryItems.join('&');
}

function getImg(photoReference) {
    let url = searchUrl + "place/photo?";
    const params = {
        maxheight: "210",
        photo_reference: photoReference,
        key: googleApi,
    };

    const queryString = formatQueryParams(params);
    url += queryString;
    console.log(url);
    fetch(url)
        .then(response => {
            if (response.ok) {
                return response.json()
            }
            throw new Error(response.statusText);
        })
        .then(responseJson => responseJson)
        .catch(err => alert(`Something went wrong: ${err.message}`));
}

function displayResults(responseJson) {
    alert('results0');
    alert('results1');
    console.log(responseJson);
    $('#results-list').empty();
    alert('results2');
    for (let i = 0; i < responseJson.candidates.length; i++) {
        alert('results3');
        let candidate = responseJson.candidates[i];
        $('#results-list').append(
            `
      <li>
        <div class="candidate">
          <div class="img-container">
            ${getImg(candidate.photos[0].photo_reference)}
          </div>
          <div class="candidate-details">
            <a class="candidate-name" href="./venue.html">${candidate.name}</a>
            <p class="rating">Rating: ${candidate.rating}</p>
            <p class="rating-total">Total rating: ${candidate.user_ratings_total}</p>
            <p class="price-level">Price: ${candidate.price_level}</p>
            <p class="candidate-address">${candidate.formatted_address}</p>
          </div>
        </div>
      </li>
      `
        );
    }

}

function getVenues(find, near) {
    let url = searchUrl + "place/findplacefromtext/json?";
    const params = {
        input: find,
        inputtype: "textquery",
        fields: "formatted_address,name,permanently_closed,photos,types,opening_hours,price_level,rating,user_ratings_total",
        locationbias: near,
        key: googleApi,
    };

    const queryString = formatQueryParams(params);
    url += queryString;
    console.log(url);
    fetch(url)
        .then(response => {
            alert("reponse1");
            if (response.ok) {
                alert("reponse2");
                return response.json();
            }
            throw new Error(response.statusText);
        })
        .then(responseJson => displayResults(responseJson))
        .catch(err => alert(`Something went wrong: ${err.message}`)
        );
}

function getGeocode(find, near) {

    let url = searchUrl + "geocode/json?";

    const params = {
        address: near,
        key: googleApi,
    };

    const queryString = formatQueryParams(params);

    url += queryString;

    console.log(url);
    fetch(url)
        .then(response => {
            if (response.ok) {
                return response.json()
            }
            throw new Error(response.statusText);
        })
        .then(responseJson => {

            const lat = responseJson.results[0].geometry.location.lat;

            const lng = responseJson.results[0].geometry.location.lng;

            let geocode = "point:" + lat + "," + lng;
            getVenues(find, geocode);
        })
        .catch(err => alert(`Something went wrong: ${err.message}`));
}

function watchForm() {
    $('form').on('submit', function (event) {
        event.preventDefault();
        const find = $('.js-find').val();
        let near = $('.js-near').val();
        if (!near) {
            near = "ipbias";
            getVenues(find, near);
        } else {
            getGeocode(find, near);
        }
    });
}

function searchDisplay() {
    let searchHTML = ``;
    let width = document.body.clientWidth;;
    if (width < 768) {
        searchHTML = `
          <form id="form">
            <label for="find">Find</label>
            <input id="find" name="find" class="js-find" placeholder="food, events, shop..." required/>
            <label for="near">Near</label>
            <input id="near" name="near" class="js-near" placeholder="address, zip, state..."/>
            <input type="submit" value="Search" onclick="location.href='./results.html';" />
          </form>
        `;
    } else {
        searchHTML = `
          <form>
            <div class="center">
              <label for="find">Find</label>
            </div>
        
            <input id="find" name="find" class="js-find" placeholder="food, events, shop..." required/>
        
            <div class="center">
              <label for="near">Near</label>
            </div>
            <input id="near" name="near" class="js-near" placeholder="address, zip, state..."/>
            <button type="submit" onclick="location.href='./results.html';" class="search-icon">
              <i class="fas fa-search"></i>
             <button>
          </form>
        `;
    }
    $("#home").html(searchHTML);
    $('.js-navbar').html(searchHTML);

}

function handleSearchDisplay() {
    $.when($.ready).then(function (event) {
        searchDisplay();
        $(window).resize(function (event) {
            searchDisplay();
        });
    });
}

$(watchForm);
$(handleSearchDisplay);