import './userWorker';

import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { convert } from './convert';
// @ts-ignore
import code from './demo.txt?raw';
// @ts-ignore
import codeProps from './demoProps.txt?raw';
// @ts-ignore
import codeWithDefaults from './demoWithDefaultsProps.txt?raw';
import { BlockOrder, ConvertOptions, PropsStyle } from './convert/types';
import { definePropsToWithDefaults } from './convert/utils/definePropsToWithDefaults';
import { withDefaultsPropsToReactivityProps } from './convert/utils/withDefaultsPropsToReactivity';

enum Converter {
	VueCompToSetup = 'vue-comp-to-setup',
	VueDefinePropsToWithDefaults = 'vue-defineProps-to-withDefaults',
	VueWithDefaultsPropsToReactivityProps = 'vue-withDefaults-props-to-reactivity-props',
}

interface State {
	converter: Converter;
	blockOrder: BlockOrder;
	propsStyle: PropsStyle;
	code: string;
}

const defaultState: State = {
	converter: Converter.VueCompToSetup,
	blockOrder: BlockOrder.SetupTemplateStyle,
	propsStyle: PropsStyle.WithDefaults,
	code: code
};

let currentState: State = { ...defaultState };

const updateURL = (state: State, shouldClear: boolean = false) => {
	if (shouldClear) {
		window.history.replaceState({}, '', window.location.pathname);
		return;
	}
	
	try {
		const params = new URLSearchParams();
		params.set('converter', state.converter);
		params.set('blockOrder', state.blockOrder);
		params.set('propsStyle', state.propsStyle);
		params.set('code', btoa(state.code));
		window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
	} catch (error) {
		console.error('Failed to update URL', error);
	}
};

const getStateFromURL = (): Partial<State> => {
	const params = new URLSearchParams(window.location.search);
	const state: Partial<State> = {};

	const converter = params.get('converter');
	if (converter && Object.values(Converter).includes(converter as Converter)) {
		state.converter = converter as Converter;
	}

	const blockOrder = params.get('blockOrder');
	if (blockOrder && Object.values(BlockOrder).includes(blockOrder as BlockOrder)) {
		state.blockOrder = blockOrder as BlockOrder;
	}

	const propsStyle = params.get('propsStyle');
	if (propsStyle && Object.values(PropsStyle).includes(propsStyle as PropsStyle)) {
		state.propsStyle = propsStyle as PropsStyle;
	}

	const encodedCode = params.get('code');
	if (encodedCode) {
		try {
			state.code = atob(encodedCode);
		} catch (e) {
			console.error('Failed to decode code from URL');
		}
	}

	return state;
};

const convertWithCurrentConverter = async (code: string, options: ConvertOptions) => {
	if (currentState.converter === Converter.VueDefinePropsToWithDefaults) {
		return definePropsToWithDefaults(code);
	}

	if (currentState.converter === Converter.VueWithDefaultsPropsToReactivityProps) {
		return withDefaultsPropsToReactivityProps(code);
	}

	return convert(code, options);
};

const init = async () => {
	// Load state from URL
	const urlState = getStateFromURL();
	currentState = { ...defaultState, ...urlState };

	const editor = monaco.editor.create(document.getElementById('editor')!, {
		value: currentState.code,
		language: 'html',
		theme: 'vs-dark',
		minimap: {
			enabled: false,
		},
	});

	const options: ConvertOptions = {
		propsOptionsLike: false,
		blockOrder: currentState.blockOrder,
		propsStyle: currentState.propsStyle,
	};

	const val = await convertWithCurrentConverter(currentState.code, options);

	const output = monaco.editor.create(document.getElementById('output'), {
		value: val.content,
		language: 'html',
		theme: 'vs-dark',
	});

	const setOutput = async () => {
		try {
			const val = await convertWithCurrentConverter(editor.getValue(), options);
			if (val.isOk) {
				output.setValue(val.content as string);
			} else {
				output.setValue((val.content as string) + val.errors.join('\n'));
			}
		} catch (error) {
			console.error(error);
		}
	};

	editor.onDidChangeModelContent(() => {
		currentState.code = editor.getValue();
		updateURL(currentState);
		setOutput()
			.then((res) => res)
			.catch(() => {
				console.error('Error');
			});
	});

	const selectConverter = document.getElementById('selectConverter') as HTMLSelectElement;
	const orderSelector = document.getElementById('blockOrder') as HTMLSelectElement;
	const propsStyleSelector = document.getElementById('propsStyle') as HTMLSelectElement;
	const resetButton = document.getElementById('resetButton') as HTMLButtonElement;

	// Set initial values from state
	selectConverter.value = currentState.converter;
	orderSelector.value = currentState.blockOrder;
	propsStyleSelector.value = currentState.propsStyle;

	selectConverter.addEventListener('change', (e) => {
		const value = (e.target as HTMLSelectElement).value as Converter;
		currentState.converter = value;

		let newCode = code;
		if (value === Converter.VueDefinePropsToWithDefaults) {
			newCode = codeProps;
		} else if (value === Converter.VueWithDefaultsPropsToReactivityProps) {
			newCode = codeWithDefaults;
		}

		currentState.code = newCode;
		editor.setValue(newCode);
		updateURL(currentState);
		setOutput();
	});

	orderSelector.addEventListener('change', (e) => {
		options.blockOrder = (e.target as HTMLSelectElement).value as BlockOrder;
		currentState.blockOrder = options.blockOrder;
		updateURL(currentState);
		setOutput();
	});

	propsStyleSelector.addEventListener('change', (e) => {
		options.propsStyle = (e.target as HTMLSelectElement).value as PropsStyle;
		currentState.propsStyle = options.propsStyle;
		updateURL(currentState);
		setOutput();
	});

	resetButton.addEventListener('click', () => {
		currentState = { ...defaultState };
		editor.setValue(currentState.code);
		selectConverter.value = currentState.converter;
		orderSelector.value = currentState.blockOrder;
		propsStyleSelector.value = currentState.propsStyle;
		options.blockOrder = currentState.blockOrder;
		options.propsStyle = currentState.propsStyle;
		updateURL(currentState, true);
		setOutput();
	});
};

init();
