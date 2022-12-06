package de.joleaf.dmn.evaluate;

import org.camunda.bpm.dmn.engine.*;
import org.camunda.bpm.engine.variable.VariableMap;
import org.camunda.bpm.engine.variable.impl.VariableMapImpl;

import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.util.stream.Collectors;

public class Main {
    public static void main(String[] args) throws FileNotFoundException {
        // create default DMN engine configuration
        DmnEngineConfiguration configuration = DmnEngineConfiguration
                .createDefaultDmnEngineConfiguration();
        DmnEngine dmnEngine = configuration.buildEngine();

        // read the DMN XML file as input stream
        FileInputStream dmnFileInputStream = new FileInputStream(args[0]);
        String dmnDecisionKey = args[1];
        // parse the DMN decision from the input stream
        DmnDecision decision = dmnEngine.parseDecision(dmnDecisionKey, dmnFileInputStream);

        // create the input variables
        VariableMap variables = new VariableMapImpl();
        for (int i = 2; i < args.length - 1; i += 2) {
            String key = args[i];
            String value = args[i + 1];
            variables.put(key, value);
        }

        // evaluate the decision
        DmnDecisionResult result = dmnEngine.evaluateDecision(decision, variables);

        // Print the result to system out
        for (DmnDecisionResultEntries r : result) {
            System.out.println(r.entrySet().stream().map(e -> e.getKey() + "::" + e.getValue().toString()).collect(Collectors.joining("||")));
        }
    }
}
