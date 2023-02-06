import {Plugin, parseYaml} from "obsidian";
import {exec} from 'child_process';
import {dmnEvaluatorBase64} from './DmnEvaluator';
import {unlinkSync, appendFileSync, existsSync} from "fs";
import * as path from "path";

interface DmnNodeParameters {
    url: string;
    decisionid: string;
    title: string;
    noresultmessage: string;
    variables: { [name: string]: string | undefined }
}

export default class ObsidianDmnEvalPlugin extends Plugin {
    async onload() {
        console.log("DMN Eval loading...");
        // create the DmnEvaluator.jar file
        await this.createDMNEvaluatorJar();

        this.registerMarkdownCodeBlockProcessor("dmn-eval", async (src, el, ctx) => {
            // Get Parameters
            let parameters: DmnNodeParameters | null = null;
            try {
                parameters = this.readParameters(src);
            } catch (e) {
                el.createEl("h3", {text: "DMN Eval parameters invalid: \n" + e.message});
                return;
            }

            console.log("Try to evaluate a DMN")
            try {
                if (parameters.url.startsWith("./")) {
                    const filePath = ctx.sourcePath;
                    const folderPath = filePath.substring(0, filePath.lastIndexOf("/"));
                    parameters.url = folderPath + path.sep + parameters.url.substring(2, parameters.url.length);
                }
                //@ts-ignore
                parameters.url = this.app.vault.adapter.getBasePath() + path.sep + parameters.url;

                let dmnParams = '"' + parameters.url + '" ' + parameters.decisionid;
                const sourceFile = this.app.metadataCache.getFirstLinkpathDest(
                    ctx.sourcePath,
                    "",
                );
                if (sourceFile != null) {
                    const sourceCache = this.app.metadataCache.getFileCache(sourceFile);
                    if (sourceCache != null) {
                        if (sourceCache.frontmatter != undefined) {
                            for (const [key, value] of Object.entries(sourceCache.frontmatter)) {
                                dmnParams += ' "' + key + '" "' + value.toString() + '"';
                            }
                        }
                    }
                }
                for (const [key, value] of Object.entries(parameters.variables)) {
                    if (value !== undefined) {
                        dmnParams += ' "' + key + '" "' + value.toString() + '"';
                    }
                }
                let jarPath = this.getJarPath();
                const parameterCopy = parameters;
                exec("java -jar " + jarPath + " " + dmnParams, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`DMN error: ${error.message}`);
                        el.createEl("h4", {text: "DMN Error", cls: "dmn-error"});
                        el.createEl("span", {text: error.message});
                    } else if (stderr) {
                        console.error(`DMN error: ${stderr}`);
                        el.createEl("h4", {text: "DMN Error", cls: "dmn-error"});
                        el.createEl("span", {text: stderr});
                    } else {
                        let lines = stdout.split("\n").map(value => value.trim()).filter(value => value.length > 0);
                        this.renderResult(lines, el, parameterCopy);
                    }
                });
            } catch (error) {
                el.createEl("h3", {text: error});
            }
        });
    }

    private async createDMNEvaluatorJar() {
        let dmnJarPath = this.getJarPath();
        console.log(dmnJarPath);
        if (existsSync(dmnJarPath)) {
            unlinkSync(dmnJarPath);
        }
        appendFileSync(dmnJarPath, Buffer.from(dmnEvaluatorBase64, 'base64'));
    }

    private getJarPath() {
        let p = this.manifest.dir + path.sep + "DmnEvaluator.jar";
        //@ts-ignore
        p = p.replace(app.vault.configDir, this.app.vault.adapter.getBasePath() + path.sep + app.vault.configDir)
        return p;
    }

    private renderResult(lines: string[], rootElement: HTMLElement, parameters: DmnNodeParameters) {
        if (parameters.title) {
            rootElement.createEl("h2", {text: parameters.title, cls: "dmn-result-title"})
        }
        if (lines.length == 0) {
            this.renderNoResult(rootElement, parameters);
        } else {
            // Check if multiple values are returned
            if (lines[0].split("||").length > 1) {
                this.renderResultTable(lines, rootElement);
            } else {
                if (lines.length == 1) {
                    this.renderSingleResult(lines[0], rootElement);
                } else {
                    this.renderResultList(lines, rootElement);
                }
            }
        }
    }

    private renderNoResult(rootElement: HTMLElement, parameters: DmnNodeParameters) {
        rootElement.createEl("span", {"text": parameters.noresultmessage});
    }

    private renderSingleResult(line: string, rootElement: HTMLElement) {
        rootElement.createEl("span", {cls: "dmn-single-result", text: line.split("::")[1]});
    }

    private renderResultList(lines: string[], rootElement: HTMLElement) {
        const ulEl = rootElement.createEl("ul", {cls: "dmn-list-result"})
        lines.forEach(value => ulEl.createEl("li", {
            text: value.split("::")[1],
        }));
    }

    private renderResultTable(lines: string[], rootElement: HTMLElement) {
        const headings = lines[0].split("||").map(value => value.split("::")[0]).sort();
        const tableEl = rootElement.createEl("table", {cls: "dmn-table-result"});
        const tableHead = tableEl.createEl("thead");
        const trHead = tableHead.createEl("tr");
        headings.forEach(value => trHead.createEl("th", {
            text: value,
        }));
        const tableBody = tableEl.createEl("tbody");
        lines.forEach(line => {
                const trBody = tableBody.createEl("tr");
                const values = line.split("||")
                    .map(x => x.split("::"));
                headings.forEach(key =>
                    trBody.createEl("td", {
                        text: values.find(c => c[0] == key)![1],
                    })
                );
            }
        );
    }

    private readParameters(jsonString: string) {
        if (jsonString.contains("[[") && !jsonString.contains('"[[')) {
            jsonString = jsonString.replace("[[", '"[[');
            jsonString = jsonString.replace("]]", ']]"');
        }

        const parameters: DmnNodeParameters = parseYaml(jsonString);

        //Transform internal Link to external
        if (parameters.url.startsWith("[[")) {
            parameters.url = parameters.url.substring(2, parameters.url.length - 2);
            // @ts-ignore
            parameters.url = this.app.metadataCache.getFirstLinkpathDest(
                parameters.url,
                ""
            ).path;
        }

        if (parameters.noresultmessage == undefined) {
            parameters.noresultmessage = "No result"
        }

        // Variables
        if (parameters.variables === undefined) {
            parameters.variables = {};
        }

        return parameters;
    }

    onunload() {
        console.log("Unloading DMN Eval plugin...");
        let dmnJarPath = this.getJarPath();
        if (existsSync(dmnJarPath)) {
            unlinkSync(dmnJarPath);
        }
    }
}
