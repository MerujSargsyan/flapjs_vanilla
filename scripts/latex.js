/** @module latex */

// -------------------------------------------------------------
// @author Meruzhan Sargsyan
//
// A module used to export the graph as text used in tikzpicture
// for easily exporting graphs into latex files
// -------------------------------------------------------------

//----------------------------------------------
// Testing Notes:
// - clipboard only available in secure contexts
//----------------------------------------------

//----------------------------------------------
// Current TODO:
// 1. Overlapping labels for self loops
// -Done Single state machine does not position 
//----------------------------------------------

import * as consts from './consts.js';
import * as linalg from './linalg.js';
import * as drawing from './drawing.js';

let debug = false; // change this to enable/disable logging
const tikzLabel = {}; // maps name of vertex in graph to it's tikz label used for reference

/**
 * compresses graph to tikz space 
 * @param {String} type - type of graph (DFA, NFA, ...)
 * @param {Array<Object>} states - the states of the graph
 * @returns {Array<String>} formatted positions of states
 */
function compress_planar(states) {
  const distance = 6;

  let centroidX = 0, centroidY = 0;
  let n = states.length;

  let output = Array(n);

  for(let i = 0; i < n; i++) {
    let state = states[i];
    centroidX += state.x;
    centroidY += state.y;
    output[i] = [state.x, state.y];
  }
  if(debug) {
    console.log(output);
  }

  centroidX /= n;
  centroidY /= n;
  let center = [centroidX, centroidY];

  let maxDist = Number.MIN_VALUE;
  for(let i = 0; i < n; i++) {
    output[i] = linalg.sub(output[i], center);
    maxDist = Math.max(maxDist, linalg.vec_len(output[i]));
  }

  let scaleFactor = distance / (2 * maxDist);
  let formatted = output.map((v) => {
    let scaled = linalg.scale(scaleFactor, v);
    return `(${scaled[0].toFixed(2)},${-1 * scaled[1].toFixed(2)})`;
  });

  if(debug) {
    console.log(formatted);
  }
  return formatted;
}

/**
 * Computes the type of a given state 
 * @param {Object} state
 * @returns {String} tikz labels for the type of state
 */
function get_state_type(state) {
  let inner = 'state,';
  if(state.is_start) {
    inner += 'initial,';
  }
  if(state.is_final) {
    inner += 'accepting,';
  }

  return inner;
}

/**
 * gives the position to place label at
 * @param {Object} edge 
 * @return {String} position of label around edge 
 */
function get_label_pos(graph, edge) {
  if(debug) {
    if(edge.from !== edge.to) {
      console.log('Edge is not a self loop');
    }
  }
  
  let [v1, v2, mid] = drawing.compute_edge_geometry(graph, edge);

  // keep in mind that html canvas grows down in y values
  if(mid[1] > v1[1] && mid[1] > v2[1]) {
    // control point below both anchors
    return 'below';
  } else if(mid[1] < v1[1] && mid[1] < v2[1]) {
    // control point above both anchors
    return 'above';
  }
  // control point in between the anchors
  if (mid[0] > v1[0] && mid[0] > v2[0]) {
    return 'right';
  } if(mid[0] < v1[0] && mid[0] < v2[0]) {
    return 'left';
  }

  return 'above';
}

/**
 * converts an edge to tikz string representation
 * @param {String} type - type of graph (DFA, NFA, ...)
 * @param {Object} edge - edge to convert to string
 * @param {String} labelPos - where to position label on edge
 * @returns {String} - tikz string representaiton of edge
 */
function edge_to_string(graph, type, edge) {
  if(debug) {
    console.log(edge);
  }
  let labelPos = get_label_pos(graph, edge);
  let bendAngle = Math.floor(edge.a2) * consts.LATEX_ANGLE_SCALE;
  let inner = `bend right=${bendAngle}`;
  let label = `${edge.transition}`; 

  if(edge.from === edge.to) {
    inner = `loop ${labelPos}`;
  }

  switch (type) {
  case 'PDA':
    label += `,${edge.pop_symbol} \\rightarrow ${edge.push_symbol}`.replaceAll('$', '\\$');
    break;
  case 'Turing':
    label += ` \\rightarrow ${edge.push_symbol}, ${edge.move}`.replaceAll('$', '\\$');
    break;
  default:
    break;
  }

  let output = `(${tikzLabel[edge.from]}) edge [${inner}] node[${labelPos}] {$${label}$} (${tikzLabel[edge.to]})\n`;
  return output.replaceAll(consts.EMPTY_SYMBOL, '\\epsilon').replaceAll(consts.EMPTY_TAPE, '\\square');
}

/**
 * @param {Object} graph - graph to be converted to latex
 * @return {String} representation of graph in latex tikzpicture
 */
export function serialize(type, graph) {
  // setup
  let distance = 2;

  let output = `\\begin{tikzpicture}[->,>=stealth\',shorten >=1pt, auto, node distance=${distance}cm, semithick]\n`;
  output += '\\tikzstyle{every state}=[text=black, fill=none]\n';

  // initializing nodes
  let states = Object.values(graph);
  states.sort((a,b) => a.x - b.x); // sorts the states from left to right

  let statePositions = compress_planar(states);

  if(states.length === 1) {
    statePositions = ["(0,0)"];
  }

  let start = states[0];
  let inner = get_state_type(start);

  for(let i = 0; i < states.length; i++) {
    let current = states[i];
    tikzLabel[current.name] = `s${i}`;
    inner = get_state_type(current);
    let position = statePositions[i];
    output += `\\node[${inner}] (${tikzLabel[current.name]}) at ${position} {$${current.name}$};\n`;
  }

  output += '\n';
  output += '\\path\n';

  for(let i = 0; i < states.length; i++) {
    let current = states[i];
    let edges = current.out; // array of edges

    for(let j = 0; j < edges.length; j++) {
      let edge = edges[j];
      output += edge_to_string(graph, type, edge);
    }
  }
  output += ';\n';

  output += '\\end{tikzpicture}';

  if(debug) {
    console.log(output);
  }

  return output;
}
