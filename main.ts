import {Plugin} from "obsidian";
import YAML from 'yaml'
import {exec} from 'child_process'

interface DmnNodeParameters {
    url: string;
    decisionId: string;
}

export default class ObsidianDmnEvalPlugin extends Plugin {

    async onload() {
        console.log("DMN Eval loading...");

        this.registerMarkdownCodeBlockProcessor("dmn-eval", async (src, el, ctx) => {
            // Get Parameters
            console.log(app.metadataCache.getFileCache(app.workspace.getActiveFile()!));
            console.log(app.metadataCache.getFileCache(app.workspace.getActiveFile()!)?.frontmatter);
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
                    parameters.url = folderPath + "/" + parameters.url.substring(2, parameters.url.length);
                }
                //@ts-ignore
                parameters.url = this.app.vault.adapter.basePath + "/" + parameters.url;
                console.log(parameters.url);

                let dmnParams = '"' + parameters.url + '" ' + parameters.decisionId;
                // @ts-ignore
                for (const [key, value] of Object.entries(app.metadataCache.getFileCache(app.workspace.getActiveFile()!)?.frontmatter)) {
                    dmnParams += ' "' + key + '" "' + value + '"';
                }
                //@ts-ignore
                let path = this.app.vault.adapter.basePath + "/" + app.vault.configDir + "/plugins/dmn-eval-plugin";
                console.log(path);
                exec("java -jar " + path + "/DmnEvaluator.jar " + dmnParams, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`DMN error: ${error.message}`);
                        el.createEl("h2", {text: "DMN Error, check log for details."})
                    } else {
                        let lines = stdout.split("\n").map(value => value.trim()).filter(value => value.length > 0);
                        this.renderResult(lines, el);
                    }
                });

            } catch (error) {
                el.createEl("h3", {text: error});
            }
        });
    }

    private renderResult(lines: string[], rootElement: HTMLElement) {
        if (lines.length == 0) {
            this.renderNoResult(rootElement);
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

    private renderNoResult(rootElement: HTMLElement) {
        rootElement.createEl("span", {"text": "No rules"});
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

        const parameters: DmnNodeParameters = YAML.parse(jsonString);

        //Transform internal Link to external
        if (parameters.url.startsWith("[[")) {
            parameters.url = parameters.url.substring(2, parameters.url.length - 2);
            // @ts-ignore
            parameters.url = this.app.metadataCache.getFirstLinkpathDest(
                parameters.url,
                ""
            ).path;
        }

        return parameters;
    }

    onunload() {
        console.log("Unloading DMN Eval plugin...");
    }
}
