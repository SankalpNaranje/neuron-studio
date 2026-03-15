class BaseOptimizer:

    def set_parameters(self, layers):
        """
        Attach model layers to the optimizer.
        Must be called before training.
        """
        raise NotImplementedError

    def step(self):
        """
        Perform one optimization step.
        Updates all parameters.
        """
        raise NotImplementedError

    def zero_grad(self):
        """
        Reset gradients after parameter update.
        """
        raise NotImplementedError