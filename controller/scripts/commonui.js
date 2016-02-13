/*
 * Copyright 2014, Gregg Tavares.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Gregg Tavares. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
"use strict";

/**
 * Implements the common UI parts of HappyFunTimes for
 * contollers.
 * @module CommonUI
 */
define([
    './io',
    './misc/cookies',
    './misc/dialog',
    './misc/fullscreen',
    './misc/logger',
    './misc/misc',
    './misc/mobilehacks',
    './misc/orientation',
  ], function(
    IO,
    Cookie,
    dialog,
    fullScreen,
    logger,
    misc,
    mobilehacks,
    orientation) {

  var $ = function(id) {
    return document.getElementById(id);
  };

  var g = {
    logger: new logger.NullLogger(),
  };

  var requireLandscapeHTML = [
      '<div id="hft-portrait" class="hft-fullsize hft-fullcenter">',
      '  <div class="hft-portrait-rot90">                         ',
      '    <div class="hft-instruction">                          ',
      '      Turn the Screen                                      ',
      '    </div>                                                 ',
      '    <div class="hft-xlarge">                               ',
      '      &#x21ba;                                             ',
      '    </div>                                                 ',
      '  </div>                                                   ',
      '</div>                                                     ',
  ].join("\n");
  var requirePortraitHTML = [
    '<div id="hft-landscape" class="hft-fullsize hft-fullcenter">',
    '  <div class="hft-landscape-rot90">                         ',
    '    <div class="hft-instruction">                           ',
    '      Turn the Screen                                       ',
    '    </div>                                                  ',
    '    <div class="hft-xlarge">                                ',
    '      &#x21bb;                                              ',
    '    </div>                                                  ',
    '  </div>                                                    ',
    '</div>                                                      ',
  ].join("\n");
  var orientationDiv;

  //function isSemiValidOrientation(o) {
  //  o = o || "";
  //  return o.indexOf("portrait") >= 0 || o.indexOf("landscape") >= 0;
  //}

  function setOrientationHTML(desiredOrientation) {
    desiredOrientation = desiredOrientation || "";
    if (!orientationDiv) {
      orientationDiv = document.createElement("div");
      //document.body.appendChild(orientationDiv);
      var h = document.getElementById("hft-menu");
      h.parentNode.insertBefore(orientationDiv, h);
    }
    if (desiredOrientation.indexOf("portrait") >= 0) {
      orientationDiv.innerHTML = requirePortraitHTML;
    } else if (desiredOrientation.indexOf("landscape") >= 0) {
      orientationDiv.innerHTML = requireLandscapeHTML;
    } else {
      orientationDiv.innerHTML = "";
    }
  }

  function resetOrientation() {
    if (fullScreen.isFullScreen()) {
      orientation.set(g.orientation);
    }
  }

  /**
   * Sets the orientation of the screen. Doesn't work on desktop
   * nor iOS unless in app.
   * @param {string} [desiredOrientation] The orientation. Valid options are
   *
   *     "portrait-primary"    // normal way people hold phones
   *     "portrait-secondary"  // upsidedown
   *     "landscape-primary"   // phone turned clockwise 90 degrees from normal
   *     "landscape-secondary" // phone turned counter-clockwise 90 degrees from normal
   *     "none" (or undefined) // unlocked
   * @param {bool} [orientationOptional]
   */
  function setOrientation(desiredOrientation, orientationOptional) {
    orientationOptional = orientationOptional;

    g.orientation = desiredOrientation;
    if (orientation.canOrient()) {
      resetOrientation();
    } else {
      var orient = g.orientation;
      if (orientationOptional) {
        orient = "none";
      }
      setOrientationHTML(orient);
    }
  }

  /**
   * @typedef {Object} ControllerUI~Options
   * @property {callback} [connectFn] function to call when controller
   *           connects to HappyFunTimes
   * @property {callback} [disconnectFn] function to call when controller is
   *           disconncted from game.
   * @property {boolean} [debug] True displays a status and debug
   *           html element
   * @property {number} [numConsoleLines] number of lines to show for the debug console.
   * @property {string} [orienation] The orientation to set the phone. Only works on Android or the App. See {@link setOrientation}.
   * @property {boolean} [orientationOptional] Don't ask the user to orient the phone if their device does not support orientation
   * @property {boolean} [requireApp] If true and we're not in the app will present a dialog saying you must use the app
   * @memberOf module:CommonUI
   */

  /**
   * Sets up the standard UI for a happyFunTimes controller
   * (phone). Including handling being disconnected from the
   * current game and switching to new games as well as name
   * input and the gear menu.
   *
   * @param {GameClient} client The `GameClient` for the phone
   * @param {module:CommonUI.ControllerUI~Options} [options] the options
   * @memberOf module:CommonUI
   */
  var setupStandardControllerUI = function(client, options) {
    options = options || {};
    var hftSettings = window.hftSettings || {};
    var menuElement = $("hft-menu");
    var disconnectedElement = $("hft-disconnected");

//    menuElement.addEventListener('click', function() {
//      settingsElement.style.display = "block";
//    });

    // setup full screen support
    var requestFullScreen = function() {
      if (!fullScreen.isFullScreen()) {
        touchStartElement.removeEventListener('touchstart', requestFullScreen, false);
        touchStartElement.style.display = "none";
        fullScreen.requestFullScreen(document.body);
      }
    };

    var goFullScreenIfNotFullScreen = function() {
      if (fullScreen.isFullScreen()) {
        resetOrientation();
      } else {
        if (fullScreen.canGoFullScreen()) {
          touchStartElement.addEventListener('touchstart', requestFullScreen, false);
          touchStartElement.style.display = "block";
        }
      }
    };
    fullScreen.onFullScreenChange(document.body, goFullScreenIfNotFullScreen);

    if (mobilehacks.isMobile()) {
       goFullScreenIfNotFullScreen();
    }

//    $("hft-mainmenu").addEventListener('click', function() {
//      window.location.href = "/";
//    }, false);
//    $("hft-reload").addEventListener('click', function() {
//      window.location.reload();
//    });

    setOrientation(options.orientation, options.orientationOptional);
  };

  /**
   * Sets the content of the status element. Only visible of debug
   * is true.
   * @memberOf module:CommonUI
   * @param {string} str value to set the status
   */
  var setStatus = function(msg) {
    if (g.statusNode) {
      g.statusNode.nodeValue = msg;
    }
  };

  /**
   * Logs a msg to the HTML based console that is only visible
   * when debug = true.
   * @memberOf module:CommonUI
   * @param {string} str msg to add to log
   */
  var log = function(str) {
    g.logger.log(str);
  };

  /**
   * Logs an error to the HTML based console that is only visible
   * when debug = true.
   * @memberOf module:CommonUI
   * @param {string} str msg to add to log
   */
  var error = function(str) {
    g.logger.error(str);
  };

  return {
    log: log,
    error: error,
    setOrientation: setOrientation,
    setStatus: setStatus,
    setupStandardControllerUI: setupStandardControllerUI,
  };
});


