/** @module menus */

import * as consts from './consts.js';
import * as graph_ops from './graph_ops.js';
import { bind_elongate_textbox } from './index.js';

export function machine_type() {
  return document.getElementById('select_machine').value;
}

/**
 * reports the type of machine the user is working on
 * @returns {boolean} true or false 
 */
export function is_NFA() {
  return machine_type() === consts.MACHINE_TYPES.NFA;
}

/**
 * reports the type of machine the user is working on
 * @returns {boolean} true or false 
 */
export function is_PDA() {
  return machine_type() === consts.MACHINE_TYPES.PDA;
}

/**
 * reports the type of machine the user is working on
 * @returns {boolean} true or false 
 */
export function is_Turing() {
  return machine_type() === consts.MACHINE_TYPES.Turing;
}

/**
 * creates the context menu to change a vertex and display it
 * @param {Object} graph - the graph containing the vertex v
 * @param {string} v - the vertex we clicked on and want to change
 * @param {float} x - x position of the top left corner of the menu
 * @param {float} y - y position of the top left corner of the menu
 */
export function display_vertex_menu(graph, v, x, y) {
  const container = document.createElement('div');
  container.className = 'context_menu';
  const rename_div = document.createElement('div');
  const buttons_div = document.createElement('div');
  const delete_div = document.createElement('div');
  delete_div.innerText = 'delete';
  delete_div.className = 'delete';
  delete_div.addEventListener('click', () => graph_ops.delete_vertex(graph, v));
  container.appendChild(rename_div);
  container.appendChild(buttons_div);
  container.appendChild(delete_div);
  const rename = document.createElement('input');
  rename.type = 'text';
  rename.value = v;  // prepopulate vertex name
  rename_div.appendChild(rename);
  const start_btn = document.createElement('button');
  start_btn.innerText = 'make start';
  start_btn.className = 'start';
  start_btn.addEventListener('click', () => graph_ops.set_start(graph, v));
  const final_btn = document.createElement('button');
  final_btn.innerText = 'toggle final';
  final_btn.className = 'final';
  final_btn.addEventListener('click', () => graph_ops.toggle_final(graph, v));
  buttons_div.appendChild(start_btn);
  buttons_div.appendChild(final_btn);
  container.style = `left:${x}px; top:${y}px`;
  container.addEventListener('keyup', e => {
    if (e.key === 'Enter') {
      graph_ops.rename_vertex(graph, v, rename.value);
    }
  });
  document.querySelector('body').appendChild(container);
  rename.focus();  // focus on the first text box
  rename.select();  // select all text
  bind_elongate_textbox();
}

/**
 * creates the context menu to change a vertex and display it
 * @param {Object} graph - the graph containing the edge
 * @param {Object} edge - the edge we clicked on and want to change
 * @param {float} x - x position of the top left corner of the menu
 * @param {float} y - y position of the top left corner of the menu
 */
export function display_edge_menu(graph, edge, x, y) {
  const container = document.createElement('div');
  container.className = 'context_menu';
  const rename_div = document.createElement('div');
  const delete_div = document.createElement('div');
  delete_div.innerText = 'delete';
  delete_div.className = 'delete';
  delete_div.addEventListener('click', () => graph_ops.delete_edge(graph, edge));
  container.appendChild(rename_div);
  container.appendChild(delete_div);
  const transition = document.createElement('input');
  transition.type = 'text';
  transition.value = edge.transition;
  const pop = document.createElement('input');
  pop.type = 'text';
  pop.value = edge.pop_symbol;
  const push = document.createElement('input');
  push.type = 'text';
  push.value = edge.push_symbol;
  const left_right_choice = document.createElement('input');
  left_right_choice.type = 'checkbox';
  left_right_choice.className = 'L_R_toggle';
  left_right_choice.checked = edge.move === consts.LEFT;
  rename_div.appendChild(transition);
  if (is_PDA()) {
    rename_div.appendChild(pop);
    rename_div.appendChild(push);
  } else if (is_Turing()) {
    rename_div.appendChild(push);
    rename_div.appendChild(left_right_choice);
  }
  container.style = `left:${x}px; top:${y}px`;
  container.addEventListener('keyup', e => {
    if (e.key === 'Enter') {
      graph_ops.rename_edge(graph, edge,
        transition.value, pop.value, push.value,
        left_right_choice.checked ? consts.LEFT : consts.RIGHT);
    }
  });
  document.querySelector('body').appendChild(container);
  transition.focus();  // focus on the first text box
  transition.select();  // select all text
  bind_elongate_textbox();
}

/** wipes the context menu; does nothing if none exists */
export function remove_context_menu() {
  const menus = document.querySelectorAll('.context_menu');
  for (const menu of menus) {
    document.querySelector('body').removeChild(menu);
  }
}

/** show/hide UI specific for a machine */
export function set_UI_visibility(machine, visible) {
  const UIs = document.getElementsByClassName(machine+'_specific');
  for (let i = 0; i < UIs.length; i++) {
    UIs[i].hidden = !visible;
  }
}

/** displays exactly those UI elements specific to the machine from {NFA, PDA, Turing} */
export function display_UI_for(machine) {
  for (const machine_type of Object.values(consts.MACHINE_TYPES)) {
    set_UI_visibility(machine_type, false);  // hide all UI elements
  }
  set_UI_visibility(machine, true);  // show only the UI elements for the specified machine
}
