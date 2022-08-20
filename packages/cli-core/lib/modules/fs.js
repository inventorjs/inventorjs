/**
 * 文件操作
 * @author: sunkeysun
 */
import path from 'node:path';
import fse from 'fs-extra';
import { globby } from 'globby';
import ejs from 'ejs';
export async function getAllFiles(dirPath) {
    const allFiles = await globby(`${dirPath}/**/*`);
    return allFiles;
}
export async function renderTemplate(templateDir, destinationDir, templateData) {
    const templateFiles = await getAllFiles(templateDir);
    const tmpDestinationDir = path.resolve('/tmp', `inventor-template-${Date.now()}`);
    for (const templateFile of templateFiles) {
        const destinationFile = path.resolve(tmpDestinationDir, templateFile.replace(templateDir, '').slice(1));
        await renderTemplateFile(templateFile, destinationFile, templateData);
        fse.mkdirp(path.dirname(destinationFile));
    }
    await fse.copy(tmpDestinationDir, destinationDir);
    await fse.remove(tmpDestinationDir);
}
export async function renderTemplateFile(templateFile, destinationFile, templateData) {
    const renderContent = await ejs.renderFile(templateFile, templateData, { async: true });
    await fse.writeFile(destinationFile, renderContent);
}