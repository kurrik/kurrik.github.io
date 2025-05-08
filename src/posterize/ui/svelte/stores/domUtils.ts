/**
 * DOM Utilities
 * 
 * These utilities replace the DOM creation functionality from BaseManager,
 * providing a bridge for components transitioning to Svelte.
 * 
 * Note: Over time, these should be phased out in favor of Svelte's built-in
 * declarative template system.
 */

/**
 * Create an HTML element with optional class name and text content
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className?: string,
  textContent?: string
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);
  
  if (className) {
    element.className = className;
  }
  
  if (textContent) {
    element.textContent = textContent;
  }
  
  return element;
}

/**
 * Create a control group container (common pattern in UI)
 */
export function createControlGroup(
  labelText: string, 
  controlId: string
): HTMLDivElement {
  const group = createElement('div', 'control-group');
  
  const label = createElement('label');
  label.setAttribute('for', controlId);
  label.textContent = labelText;
  
  group.appendChild(label);
  
  return group;
}

/**
 * Create a slider with label
 */
export function createSlider(
  min: number,
  max: number,
  value: number,
  step: number = 1,
  id?: string
): { slider: HTMLInputElement, valueDisplay: HTMLSpanElement } {
  const slider = createElement('input');
  slider.type = 'range';
  slider.min = min.toString();
  slider.max = max.toString();
  slider.value = value.toString();
  slider.step = step.toString();
  
  if (id) {
    slider.id = id;
  }
  
  const valueDisplay = createElement('span', 'slider-value');
  valueDisplay.textContent = value.toString();
  
  return { slider, valueDisplay };
}

/**
 * Create a checkbox with label
 */
export function createCheckbox(
  id: string,
  labelText: string,
  checked: boolean = false
): { container: HTMLDivElement, checkbox: HTMLInputElement } {
  const container = createElement('div', 'checkbox-container');
  
  const checkbox = createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = id;
  checkbox.checked = checked;
  
  const label = createElement('label');
  label.setAttribute('for', id);
  label.textContent = labelText;
  
  container.appendChild(checkbox);
  container.appendChild(label);
  
  return { container, checkbox };
}

/**
 * Create a button element
 */
export function createButton(
  text: string,
  className: string = 'button', 
  id?: string
): HTMLButtonElement {
  const button = createElement('button', className);
  button.textContent = text;
  
  if (id) {
    button.id = id;
  }
  
  return button;
}
