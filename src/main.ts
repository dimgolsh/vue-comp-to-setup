import './userWorker';

import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { convert } from '@/convert';
// @ts-ignore
import code from './demo.txt?raw';

const init = async () => {
	const editor = monaco.editor.create(document.getElementById('editor')!, {
		value: code,
		language: 'html',
		theme: 'vs-dark',
		minimap: {
			enabled: false,
		},
	});

	const val = await convert(code);

	const output = monaco.editor.create(document.getElementById('output'), {
		value: val,
		language: 'html',
		theme: 'vs-dark',
	});

	const setOutput = async () => {
		try {
			const val = await convert(editor.getValue());
			output.setValue(val as string);
			// eslint-disable-next-line no-empty
		} catch (error) {}
	};

	editor.onDidChangeModelContent(() => {
		setOutput()
			.then((res) => res)
			.catch(() => {
				console.error('');
			});
	});
};

init();
