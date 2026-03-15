import React from 'react';
import { Target, Zap, Settings2, Info } from 'lucide-react';
import { Button } from "@/components/ui/button";

const DOCS = {
    activations: {
        title: "Activation Functions",
        icon: Zap,
        base: "BaseActivation",
        desc: "Activation functions determine the output of a neural network node given an input or set of inputs.",
        methods: ["forward(self, inputs)", "backward(self, dvalues)"],
        requirements: ["self.output (after forward)", "self.dinputs (after backward)"],
        templates: [
            {
                name: "ReLU Template",
                code: "import numpy as np\nfrom custom_neural_network.core.Activation_Fn.base_activation import BaseActivation\n\nclass CustomReLU(BaseActivation):\n    def forward(self, inputs):\n        self.inputs = inputs\n        self.output = np.maximum(0, inputs)\n\n    def backward(self, dvalues):\n        self.dinputs = dvalues.copy()\n        self.dinputs[self.inputs <= 0] = 0"
            }
        ]
    },
    losses: {
        title: "Loss Functions",
        icon: Target,
        base: "BaseLoss",
        desc: "Loss functions calculate how wrong the model's predictions are compared to the truth.",
        methods: ["forward(self, y_pred, y_true)", "backward(self, dvalues, y_true)"],
        requirements: ["self.dinputs (after backward)"],
        templates: [
            {
                name: "MSE Template",
                code: "import numpy as np\nfrom custom_neural_network.core.Loss_Fn.base_loss import BaseLoss\n\nclass CustomMSE(BaseLoss):\n    def forward(self, y_pred, y_true):\n        sample_losses = np.mean((y_true - y_pred)**2, axis=-1)\n        return np.mean(sample_losses)\n    \n    def backward(self, dvalues, y_true):\n        samples = len(dvalues)\n        outputs = len(dvalues[0])\n        self.dinputs = -2 * (y_true - dvalues) / outputs\n        self.dinputs = self.dinputs / samples"
            }
        ]
    },
    optimizers: {
        title: "Optimizers",
        icon: Settings2,
        base: "BaseOptimizer",
        desc: "Optimizers update the model parameters to minimize the loss.",
        methods: ["set_parameters(self, layers)", "step(self)", "zero_grad(self)"],
        requirements: ["Must update layer.weights and layer.biases"],
        templates: [
            {
                name: "SGD Template",
                code: "import numpy as np\nfrom custom_neural_network.core.Optimizers.base_optimizer import BaseOptimizer\n\nclass CustomSGD(BaseOptimizer):\n    def __init__(self, learning_rate=1.0):\n        self.learning_rate = learning_rate\n        self.layers = None\n\n    def set_parameters(self, layers):\n        self.layers = layers\n\n    def step(self):\n        for layer in self.layers:\n            if hasattr(layer, 'weights'):\n                layer.weights += -self.learning_rate * layer.dweights\n                layer.biases += -self.learning_rate * layer.dbiases\n\n    def zero_grad(self):\n        for layer in self.layers:\n            if hasattr(layer, 'dweights'):\n                layer.dweights.fill(0)\n                layer.dbiases.fill(0)"
            }
        ]
    }
};

export default function ComponentInfoPanel({ categoryId, onInject }) {
    const doc = DOCS[categoryId];

    if (!doc) return null;

    const Icon = doc.icon;

    return (
        <div className="w-[30%] border-l border-slate-200 bg-slate-50 flex flex-col overflow-auto custom-scrollbar">
            <div className="p-4 border-b border-slate-200 bg-white flex items-center gap-2 sticky top-0 z-10">
                <Icon className="w-5 h-5 text-orange-500" />
                <h3 className="font-bold text-slate-800">{doc.title} Guide</h3>
            </div>

            <div className="p-5 space-y-6">
                <div>
                    <div className="flex items-center gap-1.5 text-slate-500 mb-2 font-bold text-xs uppercase tracking-wider">
                        <Info className="w-3.5 h-3.5" />
                        Base Module Contract
                    </div>
                    <code className="text-[11px] bg-orange-50 text-orange-800 px-3 py-2 rounded-lg border border-orange-100 block w-full mb-3 shadow-sm">
                        from custom_neural_network.core... import {doc.base}<br />
                        class CustomComponent({doc.base}):
                    </code>
                    <p className="text-xs text-slate-600 leading-relaxed">{doc.desc}</p>
                </div>

                <div>
                    <div className="text-slate-500 mb-3 font-bold text-xs uppercase tracking-wider">Required Methods</div>
                    <div className="space-y-2">
                        {doc.methods.map(m => (
                            <div key={m} className="text-[11px] font-mono bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 shadow-sm">
                                def {m}:
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <div className="text-slate-500 mb-2 font-bold text-xs uppercase tracking-wider">State Requirements</div>
                    <ul className="list-disc list-inside text-[11px] text-slate-600 space-y-1.5">
                        {doc.requirements.map(r => (
                            <li key={r}>{r}</li>
                        ))}
                    </ul>
                </div>

                <div className="pt-5 border-t border-slate-200">
                    <div className="text-slate-500 mb-3 font-bold text-xs uppercase tracking-wider">Quick Templates</div>
                    <div className="flex flex-col gap-2.5">
                        {doc.templates.map(t => (
                            <Button
                                key={t.name}
                                variant="outline"
                                className="w-full justify-start h-auto py-3 px-4 text-left border-orange-200 hover:border-orange-300 hover:bg-orange-50 bg-white transition-all shadow-sm group"
                                onClick={() => {
                                    if (confirm(`This will overwrite the current editor with the ${t.name}. Continue?`)) {
                                        onInject(t.code);
                                    }
                                }}
                            >
                                <div className="flex flex-col gap-1 w-full">
                                    <div className="flex items-center justify-between w-full">
                                        <span className="text-xs font-bold text-orange-600 group-hover:text-orange-700">Inject {t.name}</span>
                                        <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-bold">PASTE</span>
                                    </div>
                                    <span className="text-[10px] text-slate-500">Overwrites current editor contents</span>
                                </div>
                            </Button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
