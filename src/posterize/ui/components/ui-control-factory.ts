/**
 * Factory class for creating consistent UI controls
 * This ensures all controls follow the same grid-based layout
 */
export class UIControlFactory {
  /**
   * Create a section header
   */
  public static createSectionHeader(title: string): HTMLElement {
    const header = document.createElement('div');
    header.className = 'control-header';
    header.textContent = title;
    header.style.fontWeight = 'bold';
    header.style.marginBottom = '10px';
    header.style.marginTop = '15px';
    return header;
  }

  /**
   * Create a slider control with label (for ranges)
   */
  public static createSliderControl(
    id: string, 
    label: string, 
    value: number, 
    min: number, 
    max: number, 
    step: number = 1,
    disabled: boolean = false
  ): { 
    group: HTMLElement, 
    slider: HTMLInputElement, 
    valueDisplay: HTMLElement 
  } {
    // Create group container
    const group = document.createElement('div');
    group.className = 'slider-group';
    
    // Create label with value display
    const labelElement = document.createElement('label');
    labelElement.htmlFor = id;
    labelElement.textContent = `${label}: `;
    
    // Create value display span
    const valueDisplay = document.createElement('span');
    valueDisplay.id = `${id}Label`;
    valueDisplay.textContent = value.toString();
    labelElement.appendChild(valueDisplay);
    
    // Create slider
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = id;
    slider.min = min.toString();
    slider.max = max.toString();
    slider.step = step.toString();
    slider.value = value.toString();
    slider.disabled = disabled;
    
    // Assemble group
    group.appendChild(labelElement);
    group.appendChild(slider);
    
    return { group, slider, valueDisplay };
  }

  /**
   * Create a checkbox control with label
   */
  public static createCheckboxControl(
    id: string, 
    label: string, 
    checked: boolean = false,
    disabled: boolean = false
  ): { 
    group: HTMLElement, 
    checkbox: HTMLInputElement 
  } {
    // Create group container
    const group = document.createElement('div');
    group.className = 'control-group';
    
    // Create label
    const labelElement = document.createElement('label');
    labelElement.htmlFor = id;
    labelElement.textContent = label;
    
    // Create checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = id;
    checkbox.checked = checked;
    checkbox.disabled = disabled;
    
    // Assemble group - label in first column, checkbox in second column
    group.appendChild(labelElement);
    group.appendChild(checkbox);
    
    return { group, checkbox };
  }
  
  /**
   * Create a slider control with integrated checkbox
   */
  public static createSliderWithCheckbox(
    id: string,
    label: string,
    value: number,
    min: number,
    max: number,
    checked: boolean = false,
    step: number = 1
  ): {
    group: HTMLElement,
    slider: HTMLInputElement,
    checkbox: HTMLInputElement,
    valueDisplay: HTMLElement
  } {
    // Create group container
    const group = document.createElement('div');
    group.className = 'slider-group';
    
    // Create label with value display
    const labelElement = document.createElement('label');
    labelElement.htmlFor = id;
    labelElement.textContent = `${label}: `;
    
    // Create value display span
    const valueDisplay = document.createElement('span');
    valueDisplay.id = `${id}Label`;
    valueDisplay.textContent = value.toString();
    labelElement.appendChild(valueDisplay);
    
    // Create a container for the slider and checkbox
    const controlContainer = document.createElement('div');
    controlContainer.style.display = 'flex';
    controlContainer.style.alignItems = 'center';
    controlContainer.style.gap = '8px';
    controlContainer.style.width = '100%';
    
    // Create checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `${id}Enable`;
    checkbox.checked = checked;
    checkbox.style.marginRight = '5px';
    
    // Create slider
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = id;
    slider.min = min.toString();
    slider.max = max.toString();
    slider.step = step.toString();
    slider.value = value.toString();
    slider.disabled = !checked;
    slider.style.flex = '1';
    
    // Assemble slider and checkbox
    controlContainer.appendChild(checkbox);
    controlContainer.appendChild(slider);
    
    // Assemble group
    group.appendChild(labelElement);
    group.appendChild(controlContainer);
    
    return { group, slider, checkbox, valueDisplay };
  }

  /**
   * Create a dropdown (select) control with label
   */
  public static createDropdownControl(
    id: string, 
    label: string, 
    options: { value: string, text: string }[],
    selectedValue: string,
    disabled: boolean = false
  ): {
    group: HTMLElement,
    select: HTMLSelectElement
  } {
    // Create group container
    const group = document.createElement('div');
    group.className = 'control-group';
    
    // Create label
    const labelElement = document.createElement('label');
    labelElement.htmlFor = id;
    labelElement.textContent = label;
    
    // Create select
    const select = document.createElement('select');
    select.id = id;
    select.disabled = disabled;
    select.style.width = '100%';
    
    // Add options
    options.forEach(option => {
      const optionElement = document.createElement('option');
      optionElement.value = option.value;
      optionElement.textContent = option.text;
      optionElement.selected = option.value === selectedValue;
      select.appendChild(optionElement);
    });
    
    // Assemble group
    group.appendChild(labelElement);
    group.appendChild(select);
    
    return { group, select };
  }
}
