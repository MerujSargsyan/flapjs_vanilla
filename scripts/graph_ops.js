/** @module graph_ops */

import * as hist from './history.js';
import * as drawing from './drawing.js';
import * as consts from './consts.js';
import * as compute from './compute.js';
import * as linalg from './linalg.js';
import { Queue } from './util.js';
import * as menus from './menus.js';  // I know this is a circular dep, but it makes more sense this way
import * as graph_components from './graph_components.js';

/**
 * go through the list of used names for a vertex and find the smallest unused
 * @param {Object} graph - the graph in which we are looking for an unused name
 * @returns the smallest unused name for a vertex
 */
export function find_unused_name(graph) {
  const prefix = 'q';  // using standard notation
  let i;
  for (i = 0; i <= Object.keys(graph).length; i++) {  // we don't need to look further than how many elements in the set
    if (!(prefix+`${i}` in graph)) {
      break;
    }
  }
  return prefix+`${i}`;
}

/**
 * create a vertex at the place the user has clicked
 * @param {Object} graph - the graph in which we are creating a new vertex
 * @param {float} x - x position of the user mouse click wrt canvas
 * @param {float} y - y position of the user mouse click wrt canvas
 * @param {float} radius - the radius of the graphical element
 */
export function create_vertex(graph, x, y, radius) {
  const name = find_unused_name(graph);
  const vertex = graph_components.make_vertex(name, x, y, radius, !Object.keys(graph).length);
  graph[name] = vertex;
  drawing.draw(graph);
  hist.push_history(graph);
}

/**
 * deletes a vertex by its name as well as its associated edges
 * @param {Object} graph - the graph containing the vertex v
 * @param {string} v - the vertex you want to delete
 */
export function delete_vertex(graph, v) {
  menus.remove_context_menu();
  if (graph[v].is_start) {  // we will need a start replacement
    for (const u of Object.keys(graph)) {
      if (u === v) {
        continue;
      }
      set_start(graph, u);
      break;
    }
  }
  delete graph[v];  // remove this vertex
  for (const vertex of Object.values(graph)) {
    for (const [i, edge] of vertex.out.entries()) {
      if (edge.to === v) {
        vertex.out.splice(i, 1);
      }  // remove all edges leading to it
    }
  }
  drawing.draw(graph);
  hist.push_history(graph);
}

/**
 * renames the vertex with the new name, if name exists, nothing will be changed and user will be prompted
 * @param {Object} graph - the graph containing the vertex v
 * @param {string} v - the vertex to rename
 * @param {*} new_name - new name of the vertex
 */
export function rename_vertex(graph, v, new_name) {
  menus.remove_context_menu();
  if (v === new_name) {  // nothing to do
    return;
  } else if (new_name in graph) {
    alert(new_name + ' already exists');
  } else {
    graph[new_name] = graph[v];  // duplicate
    delete graph[v];  // remove old
    for (const vertex of Object.values(graph)) {
      for (const edge of vertex.out) {
        if (edge.from === v) {
          edge.from = new_name;
        }
        if (edge.to === v) {
          edge.to = new_name;
        }
      }
    }
  }
  drawing.draw(graph);
  hist.push_history(graph);
}

/**
 * mark a vertex as start
 * @param {Object} graph - the graph containing the vertex v
 * @param {string} v - name of the vertex
 */
export function set_start(graph, v) {
  for (const vertex of Object.values(graph)) {
    vertex.is_start = false;
  }
  graph[v].is_start = true;
  drawing.draw(graph);
  hist.push_history(graph);
}

/**
 * toggle whether a vertex is accept
 * @param {Object} graph - the graph containing the vertex v
 * @param {string} v - name of the vertex
 */
export function toggle_final(graph, v) {
  const vertex = graph[v];
  vertex.is_final = !vertex.is_final;
  if (vertex.is_final) {  // adding a circle
    drawing.draw_final_circle(vertex);
  } else {  // removing the circle, requires drawing
    drawing.draw(graph);
  }
  hist.push_history(graph);
}

/**
 * creates an edge between two vertices and draw it on the screen
 * @param {Object} graph - the graph in which we are creating a new edge
 * @param {string} u - from vertex
 * @param {string} v - to vertex
 * @param {float} angle1 - the angle which the cursor left the from vertex
 * @param {float} angle2 - the angle which the cursor entered the to vertex
 * @param {string} pop_symbol - the symbol to pop on top of the stack
 * @param {string} push_symbol - the symbol to push on top of the stack
 */
export function create_edge(graph, u, v, angle1, angle2) {
  const vertex = graph[u];
  // now we add the edge to the graph and draw it
  let a1 = 0.5, a2 = 0;
  if (u === v) {
    a1 = 0.5, a2 = 1; 
  }  // self loop
  const edge = graph_components.make_edge(u, v, a1, a2, angle1, angle2);  // make empty edge to be modified by user
  vertex.out.push(edge);
  drawing.draw(graph);
  hist.push_history(graph);
  const [, , mid] = drawing.compute_edge_geometry(graph, edge);
  // context menu to modify the edge right after
  menus.display_edge_menu(graph, edge, ...drawing.canvas_px_to_window_px(mid));
}

/**
 * delete an edge of the graph and draw
 * @param {Object} graph - the graph containing the edge we want to delete
 * @param {Object} edge the edge we want to get rid of
 */
export function delete_edge(graph, edge) {
  menus.remove_context_menu();
  for (const vertex of Object.values(graph)) {
    for (const [i, e] of vertex.out.entries()) {
      if (e.from === edge.from && e.to === edge.to && e.transition === edge.transition) {
        vertex.out.splice(i, 1);
        break;
      }
    }
  }
  drawing.draw(graph);
  hist.push_history(graph);
}

/**
 * rename the transition of an edge
 * @param {Object} graph - the graph containing the edge we want to rename
 * @param {Object} edge the edge object of which we want to rename the transition
 * @param {string} new_transition - new transition symbol
 * @param {string} new_pop - new pop symbol
 * @param {string} new_push - new push symbol
 * @param {string} new_left_right - new move (left or right)
 */
export function rename_edge(graph, edge, new_transition, new_pop, new_push, new_left_right) {
  menus.remove_context_menu();
  if (new_transition === edge.transition &&
      new_push === edge.push_symbol &&
      new_pop === edge.pop_symbol &&
      new_left_right === edge.move) {
    return;  // nothing changed, so nothing to do
  }
  [edge.transition, edge.push_symbol, edge.pop_symbol, edge.move] = [new_transition, new_push, new_pop, new_left_right];
  drawing.draw(graph);
  hist.push_history(graph);
}

/**
 * 
 * @param {Array<string>} states - a list of state labels that are to be combined
 * @returns {string} [q3, q0, q5] -> '{q0,q3,q5}'
 */
function combine_state_labels(states) {
  states = [...states];  // convert to array
  states.sort((u, v) => {
    // u, v of the form qn, qm where n, m integers
    if (u.substr(0, 1) === v.substr(0, 1) && !isNaN(u.substr(1)) && !isNaN(v.substr(1))) {
      return parseInt(u.substr(1)) < parseInt(v.substr(1));  // return the numeric comparison
    } else {
      return u < v;  // use the string comparisn
    }
  });  // sort it so eaiser to read
  return '{'+ states.join(',') +'}'
}

export function NFA_to_DFA(NFA) {
  // if (is already an DFA) return;
  const DFA = {};  // new graph to populate
  const alphabet = compute.compute_alphabet(NFA); // these will be all transitions symbols
  const send_to_trap = new Map();  // (state, transition) pairs that results in the trapped state
  
  let NFA_states = compute.closure(NFA, new Set([compute.find_start(NFA)]));  // find the start states
  let DFA_state = combine_state_labels(NFA_states);  // merge them
  let vertex_position = [100, 100];  // initial position of a new state
  DFA[DFA_state] = graph_components.make_vertex(
    DFA_state, ...vertex_position, consts.DEFAULT_VERTEX_RADIUS, true, compute.contains_final(NFA_states));
  linalg.add(consts.DEFAULT_VERTEX_RADIUS, vertex_position);  // increment vertex position

  const q = new Queue();
  q.enqueue([NFA_states]);
  while (q.length) {  // while still something to explore
    NFA_states = q.dequeue();
    DFA_state = combine_state_labels(NFA_states);
    for (const letter of alphabet) // for each letter
    {
        const newStatesSet = new Set();
        for (const state of states) // for each state do transition
        {
            nfa.doTransition(state, letter).forEach(newState => 
            {
                newStatesSet.add(newState);
            });
        }

        for (const newState of newStatesSet) // do closure on each new state
        {
            nfa.doClosureTransition(newState).forEach(epsilonState => 
            {
                newStatesSet.add(epsilonState);
            });
        }

        const newStates = Array.from(newStatesSet);
        if (newStates.length == 0) // send that transition to trap
        { 
            sendToTrap.push([dfaState, letter]); // this combo results in trapped state
            continue;
        }
        
        newStates.sort((a, b) => a.getStateLabel() < b.getStateLabel() ? -1 : 1);

        // now we have the set of new reachable states
        let newStatesLabel = newStates.map(state => state.getStateLabel()).toString();
        let newDFAState;

        // if seen before
        if (seen.has(newStatesLabel))
        {
            newDFAState = seen.get(newStatesLabel);
            dst.addTransition(dfaState, newDFAState, letter); // simply add transition
        }
        else 
        {
            newDFAState = getDFAStateFromNFAStates(newStates); // create
            dst.addState(newDFAState); // add state
            dst.addTransition(dfaState, newDFAState, letter);

            for (const newState of newStates) // check for end
            {
                if (nfa.isFinalState(newState))
                {
                    dst.setFinalState(newDFAState);
                }
            }
            
            seen.set(newStatesLabel, newDFAState); // seen
            q.push(newStates); // add to explore queue
        }
    }
  }
  // now we are done building the regular transitions, we finish all the trap states
  if (sendToTrap.length == 0) return;

  const trapState = new State('{}');
  dst.addState(trapState);
  for (const letter of alphabet)
  {
      sendToTrap.push([trapState, letter]);
  }
  for (const transition of sendToTrap) 
  {
      dst.addTransition(transition[0], trapState, transition[1]);
  }
}
