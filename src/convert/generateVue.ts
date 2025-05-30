import { SFCDescriptor } from '@vue/compiler-sfc';
import { newLine } from './utils';
import { BlockOrder } from './types';

export const generateVue = (sfc: SFCDescriptor, code: string, blockOrder = BlockOrder.SetupTemplateStyle) => {
	const codeFormat = code.trim().replaceAll(`\/\/${newLine}`, '');
	const content = sfc.template?.content?.trim() ? `<template>${sfc.template.content.trim()}</template>` : '';
	const rawCodeVue = `<script setup lang="ts">${codeFormat}</script>`;

	const styles = `${sfc.styles.map((style) => {
		const langAttr = style.attrs?.lang ? `lang="${style.attrs.lang}"` : '';
		const scopedAttr = style.scoped ? 'scoped' : '';
		const srcAttr = style.attrs?.src ? `src="${style.attrs.src}"` : '';
		
		if (srcAttr) {
			return `<style ${langAttr} ${scopedAttr} ${srcAttr} />`;
		}
		
		return `<style ${langAttr} ${scopedAttr}>${style.content.trim()}</style>`;
	}).join('\n\t')}`;

	return blockOrder === BlockOrder.TemplateSetupStyle
		? `${content}\n\n${rawCodeVue}\n\n${styles}`
		: `${rawCodeVue}\n\n${content}\n\n${styles}`;
};
