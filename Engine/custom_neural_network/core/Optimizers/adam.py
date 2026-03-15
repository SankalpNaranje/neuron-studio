from custom_neural_network.core.Optimizers.base_optimizer import BaseOptimizer
import numpy as np


class Optimizer_Adam(BaseOptimizer):

    def __init__(
        self,
        learning_rate=0.001,
        decay=0.0,
        epsilon=1e-7,
        beta_1=0.9,
        beta_2=0.999
    ):
        self.learning_rate = learning_rate
        self.current_learning_rate = learning_rate
        self.decay = decay
        self.epsilon = epsilon
        self.beta_1 = beta_1
        self.beta_2 = beta_2
        self.iterations = 0
        self.layers = None

    def set_parameters(self, layers):
        self.layers = layers

        for layer in self.layers:
            if hasattr(layer, "weights"):
                layer.weight_momentums = np.zeros_like(layer.weights)
                layer.bias_momentums = np.zeros_like(layer.biases)
                layer.weight_cache = np.zeros_like(layer.weights)
                layer.bias_cache = np.zeros_like(layer.biases)

    def step(self):

        if self.decay:
            self.current_learning_rate = (
                self.learning_rate /
                (1 + self.decay * self.iterations)
            )

        for layer in self.layers:
            if not hasattr(layer, "weights"):
                continue

            # First moment
            layer.weight_momentums = (
                self.beta_1 * layer.weight_momentums +
                (1 - self.beta_1) * layer.dweights
            )

            layer.bias_momentums = (
                self.beta_1 * layer.bias_momentums +
                (1 - self.beta_1) * layer.dbiases
            )

            # Bias correction
            weight_momentum_corrected = (
                layer.weight_momentums /
                (1 - self.beta_1 ** (self.iterations + 1))
            )

            bias_momentum_corrected = (
                layer.bias_momentums /
                (1 - self.beta_1 ** (self.iterations + 1))
            )

            # Second moment
            layer.weight_cache = (
                self.beta_2 * layer.weight_cache +
                (1 - self.beta_2) * (layer.dweights ** 2)
            )

            layer.bias_cache = (
                self.beta_2 * layer.bias_cache +
                (1 - self.beta_2) * (layer.dbiases ** 2)
            )

            # Bias correction
            weight_cache_corrected = (
                layer.weight_cache /
                (1 - self.beta_2 ** (self.iterations + 1))
            )

            bias_cache_corrected = (
                layer.bias_cache /
                (1 - self.beta_2 ** (self.iterations + 1))
            )

            # Parameter update
            layer.weights += -(
                self.current_learning_rate *
                weight_momentum_corrected /
                (np.sqrt(weight_cache_corrected) + self.epsilon)
            )

            layer.biases += -(
                self.current_learning_rate *
                bias_momentum_corrected /
                (np.sqrt(bias_cache_corrected) + self.epsilon)
            )

        self.iterations += 1

    def zero_grad(self):
        for layer in self.layers:
            if hasattr(layer, "dweights"):
                layer.dweights.fill(0)
                layer.dbiases.fill(0)