# %% 

import random
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

# Monte Carlo Simulation with 4 events having different probabilities

def monte_carlo_simulation(num_simulations=10000):
    """
    Monte Carlo simulation with 4 events:
    - Event A: Probability 0.3 (30%)
    - Event B: Probability 0.25 (25%) 
    - Event C: Probability 0.2 (20%)
    - Event D: Probability 0.25 (25%)
    """
    
    # Define events and their probabilities
    events = {
        'Event A': 0.30,
        'Event B': 0.25,
        'Event C': 0.20,
        'Event D': 0.25
    }
    
    # Results counter
    results = {event: 0 for event in events.keys()}
    
    # Run simulation
    for _ in range(num_simulations):
        rand_num = np.random.Generator.binomial(1, 0.5,2)  # Generate random number between 0 and 1

        # Determine which event occurs based on cumulative probabilities
        cumulative_prob = 0
        for event, prob in events.items():
            cumulative_prob += prob
            if rand_num <= cumulative_prob:
                results[event] += 1
                break
    
    return results, events

def create_results_dataframe(results, expected_probs, num_simulations):
    """Create a comprehensive pandas DataFrame with simulation results"""
    data = []
    for event in results.keys():
        observed_count = results[event]
        observed_prob = observed_count / num_simulations
        expected_prob = expected_probs[event]
        expected_count = expected_prob * num_simulations
        difference = abs(observed_prob - expected_prob)
        
        data.append({
            'Event': event,
            'Expected_Probability': expected_prob,
            'Expected_Count': expected_count,
            'Observed_Count': observed_count,
            'Observed_Probability': observed_prob,
            'Absolute_Difference': difference,
            'Relative_Error': difference / expected_prob if expected_prob > 0 else 0
        })
    
    df = pd.DataFrame(data)
    return df

def analyze_results_pandas(results, expected_probs, num_simulations):
    """Analyze and display simulation results using pandas"""
    df = create_results_dataframe(results, expected_probs, num_simulations)
    
    print(f"Monte Carlo Simulation Results ({num_simulations:,} simulations)")
    print("=" * 60)
    
    # Display formatted results
    display_df = df.copy()
    display_df['Expected_Probability'] = display_df['Expected_Probability'].apply(lambda x: f"{x:.1%}")
    display_df['Observed_Probability'] = display_df['Observed_Probability'].apply(lambda x: f"{x:.1%}")
    display_df['Absolute_Difference'] = display_df['Absolute_Difference'].apply(lambda x: f"{x:.1%}")
    display_df['Relative_Error'] = display_df['Relative_Error'].apply(lambda x: f"{x:.1%}")
    display_df['Expected_Count'] = display_df['Expected_Count'].round(0).astype(int)
    
    print(display_df.to_string(index=False))
    print()
    
    # Summary statistics
    print("Summary Statistics:")
    print("-" * 30)
    print(f"Total simulations: {num_simulations:,}")
    print(f"Mean absolute error: {df['Absolute_Difference'].mean():.3%}")
    print(f"Max absolute error: {df['Absolute_Difference'].max():.3%}")
    print(f"Mean relative error: {df['Relative_Error'].mean():.3%}")
    print()
    
    return df

def plot_results(results, expected_probs, num_simulations):
    """Create a bar chart comparing expected vs observed probabilities using pandas"""
    # Create DataFrame with the results
    data = {
        'Event': list(results.keys()),
        'Expected': [expected_probs[event] for event in results.keys()],
        'Observed': [results[event] / num_simulations for event in results.keys()]
    }
    
    df = pd.DataFrame(data)
    df.set_index('Event', inplace=True)
    
    # Create the plot using pandas
    ax = df.plot(kind='bar', 
                 figsize=(10, 6), 
                 alpha=0.8,
                 title=f'Monte Carlo Simulation: Expected vs Observed Probabilities\n({num_simulations:,} simulations)')
    
    ax.set_xlabel('Events')
    ax.set_ylabel('Probability')
    ax.legend(['Expected', 'Observed'])
    ax.grid(True, alpha=0.3)
    
    # Add value labels on bars
    for container in ax.containers:
        ax.bar_label(container, fmt='%.1%', label_type='edge')
    
    plt.xticks(rotation=45)
    plt.tight_layout()
    plt.show()
    
    # Also display the DataFrame
    print("\nResults DataFrame:")
    print("=" * 40)
    df_display = df.copy()
    df_display['Expected'] = df_display['Expected'].apply(lambda x: f"{x:.1%}")
    df_display['Observed'] = df_display['Observed'].apply(lambda x: f"{x:.1%}")
    df_display['Difference'] = (df['Observed'] - df['Expected']).abs().apply(lambda x: f"{x:.1%}")
    print(df_display)

# Run the simulation
if __name__ == "__main__":
    # Number of simulations to run
    NUM_SIMULATIONS = 100000
    
    print("Running Monte Carlo Simulation...")
    results, expected_probs = monte_carlo_simulation(NUM_SIMULATIONS)
    
    # Analyze results using pandas
    df_results = analyze_results_pandas(results, expected_probs, NUM_SIMULATIONS)
    
    # Plot results
    plot_results(results, expected_probs, NUM_SIMULATIONS)
    
    # Additional analysis: Convergence test using pandas
    print("\nConvergence Analysis:")
    print("=" * 30)
    
    simulation_sizes = [1000, 5000, 10000, 50000, 100000]
    convergence_data = []
    
    for size in simulation_sizes:
        temp_results, _ = monte_carlo_simulation(size)
        for event in temp_results.keys():
            observed_prob = temp_results[event] / size
            expected_prob = expected_probs[event]
            error = abs(observed_prob - expected_prob)
            convergence_data.append({
                'Simulations': size,
                'Event': event,
                'Observed_Probability': observed_prob,
                'Expected_Probability': expected_prob,
                'Error': error
            })
    
    convergence_df = pd.DataFrame(convergence_data)
    
    # Display convergence results
    print("\nConvergence DataFrame:")
    pivot_df = convergence_df.pivot(index='Simulations', columns='Event', values='Error')
    print(pivot_df.round(4))
    
    # Plot convergence
    print("\nPlotting convergence analysis...")
    pivot_df.plot(kind='line', 
                  figsize=(12, 6),
                  title='Monte Carlo Convergence Analysis: Error vs Number of Simulations',
                  xlabel='Number of Simulations',
                  ylabel='Absolute Error',
                  grid=True,
                  alpha=0.8)
    plt.yscale('log')
    plt.tight_layout()
    plt.show()

# %%
