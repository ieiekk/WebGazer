// Set to true if you want to save the data even if you reload the page.
window.saveDataAcrossSessions = true;

// heatmap configuration
const config = {
  radius: 35,
  maxOpacity: .3,
  minOpacity: 0,
  blur: .75
};

// Global variables
let heatmapInstance;

window.addEventListener('load', async function () {
  // Init webgazer
  if (!window.saveDataAcrossSessions) {
    var localstorageDataLabel = 'webgazerGlobalData';
    localforage.setItem(localstorageDataLabel, null);
    var localstorageSettingsLabel = 'webgazerGlobalSettings';
    localforage.setItem(localstorageSettingsLabel, null);
  }
  const webgazerInstance = await webgazer.setRegression('ridge') /* currently must set regression and tracker */
    .setTracker('TFFacemesh')
    .begin();

  // Turn off video
  webgazerInstance.showVideoPreview(true) /* shows all video previews */
    .showPredictionPoints(false); /* shows a square every 100 milliseconds where current prediction is */

  // Enable smoothing
  webgazerInstance.applyKalmanFilter(true); // Kalman Filter defaults to on.

  // Set up heatmap parts
  setupHeatmap();
  webgazer.setGazeListener(eyeListener);

  // Set up bg video
  setupBackgroundVideo();

  //Set up the webgazer video feedback.
  var setup = function () {

    //Set up the main canvas. The main canvas is used to calibrate the webgazer.
    var canvas = document.getElementById("plotting_canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.position = 'fixed';

  };
  setup();

});

window.addEventListener('beforeunload', function () {
  if (window.saveDataAcrossSessions) {
    webgazer.end();
  } else {
    localforage.clear();
  }
});





// Trimmed down version of webgazer's click listener since the built-in one isn't exported
// Needed so we can have just the click listener without the move listener
// (The move listener was creating a lot of drift)
async function clickListener(event) {
  webgazer.recordScreenPosition(event.clientX, event.clientY, 'click'); // eventType[0] === 'click'
}

function setupHeatmap() {
  // Don't use mousemove listener
  webgazer.removeMouseEventListeners();
  document.body.addEventListener('click', clickListener);

  // Get the window size
  let height = window.innerHeight;
  let width = window.innerWidth;

  // Set up the container
  let container = document.getElementById('heatmapContainer');
  container.style.height = `${height}px`;
  container.style.width = `${width}px`;
  config.container = container;

  // create heatmap
  heatmapInstance = h337.create(config);

  window.heatmapInstance = heatmapInstance;

  // Clean old data every 10s
  setInterval(() => {
    const data = window.heatmapInstance.getData().data.slice(-100);

    // Repaint
    window.heatmapInstance.setData({
      data
    });
  }, 10000);
}

// Heatmap buffer
let lastTime;
let lastGaze;

async function eyeListener(data, clock) {
  // data is the gaze data, clock is the time since webgazer.begin()

  // Init if lastTime not set
  if (!lastTime) {
    lastTime = clock;
  }

  // In this we want to track how long a point was being looked at,
  // so we need to buffer where the gaze moves to and then on next move
  // we calculate how long the gaze stayed there.
  if (!!lastGaze) {
    if (!!lastGaze.x && !!lastGaze.y) {
      let duration = clock - lastTime;
      let point = {
        x: Math.floor(lastGaze.x),
        y: Math.floor(lastGaze.y),
        value: duration
      };
      heatmapInstance.addData(point);

    }
  }

  lastGaze = data;
  lastTime = clock;
}



function setupBackgroundVideo() {
  const container = document.querySelector("#iframeContainer");
  container.style.width = `${innerWidth}px`;
  container.style.height = `${innerHeight - 70}px`;
}


/**
 * Restart the calibration process by clearing the local storage and reseting the calibration point
 */
function Restart() {
  document.getElementById("Accuracy").innerHTML = "<a>Not yet Calibrated</a>";
  webgazer.clearData();
  ClearCalibration();
  PopUpInstruction();

  // Hide BG Vid
  const iframeContainer = document.querySelector("#iframeContainer");
  iframeContainer.style.opacity = "0.2";
  iframeContainer.style.pointerEvents = "none";

}
