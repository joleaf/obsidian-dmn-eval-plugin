package de.joleaf.dmn.evaluate;

import org.camunda.bpm.dmn.engine.*;
import org.camunda.bpm.engine.variable.VariableMap;
import org.camunda.bpm.engine.variable.impl.VariableMapImpl;

import java.io.FileInputStream;
import java.util.stream.Collectors;

public class Main {
    public static void main(String[] args) {
        // create default DMN engine configuration
        DmnEngineConfiguration configuration = DmnEngineConfiguration
                .createDefaultDmnEngineConfiguration();
        DmnEngine dmnEngine = configuration.buildEngine();

        // read the DMN XML file as input stream
        DmnDecision decision;
        try {
            FileInputStream dmnFileInputStream = new FileInputStream(args[0]);
            String dmnDecisionKey = args[1];
            // parse the DMN decision from the input stream
            decision = dmnEngine.parseDecision(dmnDecisionKey, dmnFileInputStream);
        } catch (Exception e) {
            System.err.println("Error while reading decision!");
            System.err.println(e.getMessage());
            return;
        }

        // create the input variables
        VariableMap variables;
        try {
            variables = new VariableMapImpl();
            for (int i = 2; i < args.length - 1; i += 3) {
                String key = args[i];
                String value = args[i + 1];
                String type = args[i + 2];
                if ("number".equals(type)) {
                    variables.put(key, Double.parseDouble(value));
                } else if ("boolean".equals(type)) {
                    variables.put(key, Boolean.parseBoolean(value));
                } else {
                    variables.put(key, value);
                }
            }
        } catch (Exception e) {
            System.err.println("Error while reading variables!");
            System.err.println(e.getMessage());
            return;
        }

        // evaluate the decision
        DmnDecisionResult result;
        try {
            result = dmnEngine.evaluateDecision(decision, variables);
        } catch (Exception e) {
            System.err.println("Error while evaluating decision!");
            System.err.println(e.getMessage());
            return;
        }

        // Print the result to system out
        for (DmnDecisionResultEntries r : result) {
            System.out.println(r.entrySet().stream().map(e -> e.getKey() + "::" + e.getValue().toString()).collect(Collectors.joining("||")));
        }
    }
}
